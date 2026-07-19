import type { AccountRecord } from "../account";
import type {
  BudgetRecord,
  EnvelopeAllocationRecord,
  EnvelopeTransferRecord,
} from "../budget";
import type { BudgetCategoryRecord } from "../assignment";
import type { TransactionRecord } from "../transaction";
import { formatMoney, parseMoney } from "../shared";
export interface ReportingRepositoryPort {
  listAccounts(userId: string): Promise<AccountRecord[]>;
  listTransactions(
    userId: string,
    from?: string,
    to?: string,
  ): Promise<TransactionRecord[]>;
  listBudgets(
    userId: string,
    from: string,
    to: string,
  ): Promise<BudgetRecord[]>;
  listBudgetCategories(budgetIds: string[]): Promise<BudgetCategoryRecord[]>;
  listEnvelopeAllocations(
    budgetIds: string[],
    from: string,
    to: string,
  ): Promise<EnvelopeAllocationRecord[]>;
  listBudgetTransfers(
    budgetIds: string[],
    from: string,
    to: string,
  ): Promise<EnvelopeTransferRecord[]>;
}
export interface AccountBalance {
  accountId: string;
  currency: string;
  balance: string;
  excludedTransactionIds: string[];
}
export interface BudgetUsage {
  budgetId: string;
  mode: BudgetRecord["mode"];
  currency: string;
  spent: string;
  remaining: string;
  assigned: string;
  available: string;
  excludedTransactionIds: string[];
}
export interface PeriodSpending {
  currency: string;
  income: string;
  expenses: string;
  net: string;
  transactionCount: number;
}
export interface CategorySpending {
  categoryId: string | null;
  currency: string;
  amount: string;
  transactionCount: number;
}
export interface NetWorthPoint {
  date: string;
  currency: string;
  balance: string;
}

const FINANCIAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function financialDayRange(from: string, to: string, timezone: string) {
  const start = zonedMidnight(from, timezone);
  const endExclusive = zonedMidnight(nextFinancialDate(to), timezone);
  return {
    from: new Date(start).toISOString(),
    to: new Date(endExclusive - 1).toISOString(),
  };
}

function zonedMidnight(value: string, timezone: string) {
  const [year, month, day] = financialDateParts(value);
  const target = Date.UTC(year, month - 1, day);
  let result = target;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const values = Object.fromEntries(
      formatter
        .formatToParts(new Date(result))
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, Number(part.value)]),
    );
    const represented = Date.UTC(
      values.year!,
      values.month! - 1,
      values.day!,
      values.hour!,
      values.minute!,
      values.second!,
    );
    const adjusted = result + (target - represented);
    if (adjusted === result) return result;
    result = adjusted;
  }
  return result;
}

function financialDateParts(value: string): [number, number, number] {
  const match = FINANCIAL_DATE.exec(value);
  if (!match) throw new Error(`Invalid financial date: ${value}`);
  const result: [number, number, number] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ];
  if (
    new Date(Date.UTC(result[0], result[1] - 1, result[2]))
      .toISOString()
      .slice(0, 10) !== value
  )
    throw new Error(`Invalid financial date: ${value}`);
  return result;
}

function nextFinancialDate(value: string) {
  const [year, month, day] = financialDateParts(value);
  return new Date(Date.UTC(year, month - 1, day + 1))
    .toISOString()
    .slice(0, 10);
}

export class ReportingService {
  constructor(private readonly repository: ReportingRepositoryPort) {}
  // Concurrency note: Safe computed-on-read projection; balances are never written and each visible transaction contributes independently.
  async accountBalances(userId: string): Promise<AccountBalance[]> {
    const [accounts, transactions] = await Promise.all([
      this.repository.listAccounts(userId),
      this.repository.listTransactions(userId),
    ]);
    return accounts.map((account) => {
      let balance = parseMoney(account.openingBalance);
      const excluded: string[] = [];
      for (const transaction of transactions) {
        if (transaction.currency !== account.currency) {
          if (
            transaction.accountId === account.id ||
            transaction.transferAccountId === account.id
          )
            excluded.push(transaction.id);
          continue;
        }
        const amount = parseMoney(transaction.amount);
        if (
          transaction.type === "INCOME" &&
          transaction.accountId === account.id
        )
          balance += amount;
        else if (
          transaction.type === "EXPENSE" &&
          transaction.accountId === account.id
        )
          balance -= amount;
        else if (transaction.type === "TRANSFER") {
          if (transaction.accountId === account.id) balance -= amount;
          if (transaction.transferAccountId === account.id) balance += amount;
        }
      }
      return {
        accountId: account.id,
        currency: account.currency,
        balance: formatMoney(balance),
        excludedTransactionIds: excluded,
      };
    });
  }
  async periodSpending(
    userId: string,
    from: string,
    to: string,
  ): Promise<PeriodSpending[]> {
    const transactions = await this.repository.listTransactions(
      userId,
      from,
      to,
    );
    const totals = new Map<
      string,
      { income: bigint; expenses: bigint; transactionCount: number }
    >();
    for (const transaction of transactions) {
      if (transaction.type === "TRANSFER") continue;
      const total = totals.get(transaction.currency) ?? {
        income: 0n,
        expenses: 0n,
        transactionCount: 0,
      };
      if (transaction.type === "INCOME")
        total.income += parseMoney(transaction.amount);
      else total.expenses += parseMoney(transaction.amount);
      total.transactionCount += 1;
      totals.set(transaction.currency, total);
    }
    return [...totals.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([currency, total]) => ({
        currency,
        income: formatMoney(total.income),
        expenses: formatMoney(total.expenses),
        net: formatMoney(total.income - total.expenses),
        transactionCount: total.transactionCount,
      }));
  }
  async categorySpending(
    userId: string,
    from: string,
    to: string,
  ): Promise<CategorySpending[]> {
    const transactions = await this.repository.listTransactions(
      userId,
      from,
      to,
    );
    const totals = new Map<
      string,
      {
        categoryId: string | null;
        currency: string;
        amount: bigint;
        transactionCount: number;
      }
    >();
    for (const transaction of transactions) {
      if (transaction.type !== "EXPENSE") continue;
      const key = `${transaction.categoryId ?? "uncategorized"}:${transaction.currency}`;
      const total = totals.get(key) ?? {
        categoryId: transaction.categoryId,
        currency: transaction.currency,
        amount: 0n,
        transactionCount: 0,
      };
      total.amount += parseMoney(transaction.amount);
      total.transactionCount += 1;
      totals.set(key, total);
    }
    return [...totals.values()]
      .sort((left, right) =>
        left.currency === right.currency
          ? right.amount > left.amount
            ? 1
            : right.amount < left.amount
              ? -1
              : 0
          : left.currency.localeCompare(right.currency),
      )
      .map((total) => ({
        ...total,
        amount: formatMoney(total.amount),
      }));
  }
  async netWorthHistory(
    userId: string,
    from: string,
    to: string,
    timezone = "UTC",
  ): Promise<NetWorthPoint[]> {
    const completeRange = financialDayRange(from, to, timezone);
    const [accounts, transactions] = await Promise.all([
      this.repository.listAccounts(userId),
      this.repository.listTransactions(userId, undefined, completeRange.to),
    ]);
    const start = new Date(`${from}T00:00:00Z`);
    const end = new Date(`${to}T00:00:00Z`);
    if (
      Number.isNaN(start.valueOf()) ||
      Number.isNaN(end.valueOf()) ||
      start > end ||
      (end.valueOf() - start.valueOf()) / 86_400_000 > 366
    )
      throw new Error(
        "Net-worth history requires a valid range of at most 366 days",
      );
    const result: NetWorthPoint[] = [];
    for (
      let cursor = start;
      cursor <= end;
      cursor = new Date(cursor.valueOf() + 86_400_000)
    ) {
      const date = cursor.toISOString().slice(0, 10);
      const endOfDay = financialDayRange(date, date, timezone).to;
      const totals = new Map<string, bigint>();
      for (const account of accounts) {
        if (account.createdAt > endOfDay) continue;
        totals.set(
          account.currency,
          (totals.get(account.currency) ?? 0n) +
            parseMoney(account.openingBalance),
        );
      }
      for (const transaction of transactions) {
        if (transaction.occurredAt > endOfDay) continue;
        const amount = parseMoney(transaction.amount);
        if (transaction.type === "INCOME")
          totals.set(
            transaction.currency,
            (totals.get(transaction.currency) ?? 0n) + amount,
          );
        else if (transaction.type === "EXPENSE")
          totals.set(
            transaction.currency,
            (totals.get(transaction.currency) ?? 0n) - amount,
          );
      }
      for (const [currency, balance] of [...totals].sort(([a], [b]) =>
        a.localeCompare(b),
      ))
        result.push({ date, currency, balance: formatMoney(balance) });
    }
    return result;
  }
  // Concurrency note: Safe computed-on-read projection; budget usage is derived from source transactions and assignments and is never persisted.
  async budgetUsage(
    userId: string,
    from: string,
    to: string,
    timezone = "UTC",
  ): Promise<BudgetUsage[]> {
    const budgets = await this.repository.listBudgets(userId, from, to);
    const earliestStart = budgets.reduce(
      (earliest, budget) =>
        budget.startsOn < earliest ? budget.startsOn : earliest,
      from,
    );
    const transactionRange = financialDayRange(earliestStart, to, timezone);
    const currentRange = financialDayRange(from, to, timezone);
    const transactions = await this.repository.listTransactions(
      userId,
      transactionRange.from,
      transactionRange.to,
    );
    const budgetIds = budgets.map((b) => b.id);
    const [assignments, allocations, transfers] = await Promise.all([
      this.repository.listBudgetCategories(budgetIds),
      this.repository.listEnvelopeAllocations(budgetIds, earliestStart, to),
      this.repository.listBudgetTransfers(budgetIds, earliestStart, to),
    ]);
    return budgets.map((budget) => {
      const categoryIds = new Set(
        assignments
          .filter((a) => a.budgetId === budget.id)
          .map((a) => a.categoryId),
      );
      let spent = 0n;
      let previousSpent = 0n;
      const excluded: string[] = [];
      for (const transaction of transactions) {
        if (
          transaction.type !== "EXPENSE" ||
          !transaction.categoryId ||
          !categoryIds.has(transaction.categoryId)
        )
          continue;
        if (transaction.currency !== budget.currency) {
          excluded.push(transaction.id);
          continue;
        }
        if (transaction.occurredAt < currentRange.from)
          previousSpent += parseMoney(transaction.amount);
        else spent += parseMoney(transaction.amount);
      }
      const assigned = allocations
        .filter(
          (allocation) =>
            allocation.budgetId === budget.id && allocation.occurredAt >= from,
        )
        .reduce(
          (total, allocation) => total + parseMoney(allocation.amount),
          0n,
        );
      const incoming = transfers
        .filter(
          (transfer) =>
            transfer.budgetId === budget.id &&
            transfer.occurredAt >= from &&
            transfer.toCategoryId &&
            categoryIds.has(transfer.toCategoryId),
        )
        .reduce((total, transfer) => total + parseMoney(transfer.amount), 0n);
      const outgoing = transfers
        .filter(
          (transfer) =>
            transfer.budgetId === budget.id &&
            transfer.occurredAt >= from &&
            transfer.fromCategoryId &&
            categoryIds.has(transfer.fromCategoryId),
        )
        .reduce((total, transfer) => total + parseMoney(transfer.amount), 0n);
      const previousAssigned = allocations
        .filter(
          (allocation) =>
            allocation.budgetId === budget.id && allocation.occurredAt < from,
        )
        .reduce(
          (total, allocation) => total + parseMoney(allocation.amount),
          0n,
        );
      const previousIncoming = transfers
        .filter(
          (transfer) =>
            transfer.budgetId === budget.id &&
            transfer.occurredAt < from &&
            transfer.toCategoryId &&
            categoryIds.has(transfer.toCategoryId),
        )
        .reduce((total, transfer) => total + parseMoney(transfer.amount), 0n);
      const previousOutgoing = transfers
        .filter(
          (transfer) =>
            transfer.budgetId === budget.id &&
            transfer.occurredAt < from &&
            transfer.fromCategoryId &&
            categoryIds.has(transfer.fromCategoryId),
        )
        .reduce((total, transfer) => total + parseMoney(transfer.amount), 0n);
      const previousAvailable =
        previousAssigned + previousIncoming - previousOutgoing - previousSpent;
      const carryOver =
        budget.rolloverPolicy === "FULL"
          ? previousAvailable
          : budget.rolloverPolicy === "POSITIVE_ONLY" && previousAvailable > 0n
            ? previousAvailable
            : 0n;
      const available = carryOver + assigned + incoming - outgoing - spent;
      return {
        budgetId: budget.id,
        mode: budget.mode,
        currency: budget.currency,
        spent: formatMoney(spent),
        remaining: formatMoney(parseMoney(budget.amount) - spent),
        assigned: formatMoney(assigned),
        available: formatMoney(available),
        excludedTransactionIds: excluded,
      };
    });
  }
}
