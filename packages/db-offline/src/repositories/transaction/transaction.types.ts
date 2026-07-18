import type { NewTransaction } from "../../schema";

export type CreateTransactionInput = NewTransaction;
export type UpdateTransactionInput = Partial<
  Omit<NewTransaction, "id" | "userId" | "createdAt">
>;

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
  search?: string;
  offset?: number;
  limit?: number;
}
