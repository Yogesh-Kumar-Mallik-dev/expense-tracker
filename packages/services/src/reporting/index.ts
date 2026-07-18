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
  // Concurrency note: Safe computed-on-read projection; budget usage is derived from source transactions and assignments and is never persisted.
  async budgetUsage(
    userId: string,
    from: string,
    to: string,
  ): Promise<BudgetUsage[]> {
    const budgets = await this.repository.listBudgets(userId, from, to);
    const earliestStart = budgets.reduce(
      (earliest, budget) =>
        budget.startsOn < earliest ? budget.startsOn : earliest,
      from,
    );
    const transactions = await this.repository.listTransactions(
      userId,
      earliestStart,
      to,
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
        if (transaction.occurredAt.slice(0, 10) < from)
          previousSpent += parseMoney(transaction.amount);
        else spent += parseMoney(transaction.amount);
      }
      const assigned = allocations
        .filter(
          (allocation) =>
            allocation.budgetId === budget.id &&
            allocation.occurredAt >= from,
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
            allocation.budgetId === budget.id &&
            allocation.occurredAt < from,
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
        previousAssigned +
        previousIncoming -
        previousOutgoing -
        previousSpent;
      const carryOver =
        budget.rolloverPolicy === "FULL"
          ? previousAvailable
          : budget.rolloverPolicy === "POSITIVE_ONLY" &&
              previousAvailable > 0n
            ? previousAvailable
            : 0n;
      const available =
        carryOver + assigned + incoming - outgoing - spent;
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
