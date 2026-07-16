import type { AccountRecord } from "../account";
import type { BudgetRecord } from "../budget";
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
}
export interface AccountBalance {
  accountId: string;
  currency: string;
  balance: string;
  excludedTransactionIds: string[];
}
export interface BudgetUsage {
  budgetId: string;
  currency: string;
  spent: string;
  remaining: string;
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
    const [budgets, transactions] = await Promise.all([
      this.repository.listBudgets(userId, from, to),
      this.repository.listTransactions(userId, from, to),
    ]);
    const assignments = await this.repository.listBudgetCategories(
      budgets.map((b) => b.id),
    );
    return budgets.map((budget) => {
      const categoryIds = new Set(
        assignments
          .filter((a) => a.budgetId === budget.id)
          .map((a) => a.categoryId),
      );
      let spent = 0n;
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
        spent += parseMoney(transaction.amount);
      }
      return {
        budgetId: budget.id,
        currency: budget.currency,
        spent: formatMoney(spent),
        remaining: formatMoney(parseMoney(budget.amount) - spent),
        excludedTransactionIds: excluded,
      };
    });
  }
}
