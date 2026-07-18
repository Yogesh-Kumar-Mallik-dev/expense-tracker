import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";
import type { OfflineDatabase } from "../../database";
import { transactions } from "../../schema";
import type { CreateTransactionInput, TransactionFilters, UpdateTransactionInput } from "./transaction.types";

export class TransactionRepository {
  constructor(private readonly db: OfflineDatabase) {}

  create(data: CreateTransactionInput) {
    return this.db.insert(transactions).values(data);
  }

  async findById(id: string, userId: string) {
    return (await this.db.select().from(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId), isNull(transactions.deletedAt))).limit(1))[0] ?? null;
  }

  listByUser(userId: string, filters: TransactionFilters = {}) {
    return this.db.select().from(transactions).where(and(
      eq(transactions.userId, userId),
      isNull(transactions.deletedAt),
      filters.accountId ? eq(transactions.accountId, filters.accountId) : undefined,
      filters.categoryId ? eq(transactions.categoryId, filters.categoryId) : undefined,
      filters.from ? gte(transactions.occurredAt, filters.from) : undefined,
      filters.to ? lte(transactions.occurredAt, filters.to) : undefined,
    )).orderBy(desc(transactions.occurredAt)).limit(filters.limit ?? 50).offset(filters.offset ?? 0);
  }

  update(id: string, userId: string, data: UpdateTransactionInput) {
    return this.db.update(transactions).set(data).where(and(eq(transactions.id, id), eq(transactions.userId, userId), isNull(transactions.deletedAt)));
  }

  delete(id: string, userId: string) {
    return this.db.update(transactions).set({ deletedAt: new Date().toISOString() }).where(and(eq(transactions.id, id), eq(transactions.userId, userId), isNull(transactions.deletedAt)));
  }

  restore(id: string, userId: string, updatedAt: string) {
    return this.db.update(transactions).set({ deletedAt: null, updatedAt }).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
  }
}
