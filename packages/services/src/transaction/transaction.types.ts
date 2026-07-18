export type TransactionType = "EXPENSE" | "INCOME" | "TRANSFER";

export interface TransactionRecord {
  id: string;
  userId: string;
  accountId: string;
  transferAccountId: string | null;
  categoryId: string | null;
  type: TransactionType;
  amount: string;
  currency: string;
  description: string | null;
  note: string | null;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type CreateTransactionInput = Omit<
  TransactionRecord,
  "id" | "createdAt" | "updatedAt" | "deletedAt"
>;
export type UpdateTransactionInput = Pick<
  TransactionRecord,
  "accountId" | "transferAccountId" | "type"
> &
  Partial<
    Pick<
      TransactionRecord,
      | "categoryId"
      | "amount"
      | "currency"
      | "description"
      | "note"
      | "occurredAt"
    >
  >;

export interface TransactionRepositoryPort {
  create(value: TransactionRecord): Promise<unknown>;
  findById(id: string, userId: string): Promise<TransactionRecord | null>;
  listByUser(
    userId: string,
    filters?: {
      accountId?: string;
      categoryId?: string;
      from?: string;
      to?: string;
      offset?: number;
      limit?: number;
    },
  ): Promise<TransactionRecord[]>;
  listPageByUser?(
    userId: string,
    filters: {
      accountId?: string;
      categoryId?: string;
      from?: string;
      to?: string;
      offset: number;
      limit: number;
    },
  ): Promise<{ items: TransactionRecord[]; total: number }>;
  update(
    id: string,
    userId: string,
    value: UpdateTransactionInput & { updatedAt: string },
  ): Promise<unknown>;
  delete(id: string, userId: string): Promise<unknown>;
  restore(id: string, userId: string, updatedAt: string): Promise<unknown>;
}
