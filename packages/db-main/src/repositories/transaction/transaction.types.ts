import type { Prisma } from "../../generated/prisma/client";

export type CreateTransactionInput = Prisma.TransactionUncheckedCreateInput;
export type UpdateTransactionInput = Prisma.TransactionUncheckedUpdateInput;

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  from?: Date;
  to?: Date;
  skip?: number;
  take?: number;
}
