import { and, asc, eq } from "drizzle-orm";
import type { OfflineDatabase } from "../../database";
import { tags, transactions, transactionTags } from "../../schema";
import type { CreateTransactionTagInput } from "./transactionTag.types";

export class TransactionTagRepository {
  constructor(private readonly db: OfflineDatabase) {}

  create(data: CreateTransactionTagInput) {
    return this.db.insert(transactionTags).values(data);
  }

  listByTransaction(transactionId: string, userId: string) {
    return this.db
      .select({ assignment: transactionTags, tag: tags })
      .from(transactionTags)
      .innerJoin(transactions, eq(transactionTags.transactionId, transactions.id))
      .innerJoin(tags, eq(transactionTags.tagId, tags.id))
      .where(and(eq(transactionTags.transactionId, transactionId), eq(transactions.userId, userId)))
      .orderBy(asc(transactionTags.createdAt));
  }

  delete(transactionId: string, tagId: string, userId: string) {
    const ownedTransaction = this.db
      .select({ id: transactions.id })
      .from(transactions)
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));

    return this.db.delete(transactionTags).where(and(
      eq(transactionTags.transactionId, transactionId),
      eq(transactionTags.tagId, tagId),
      eq(transactionTags.transactionId, ownedTransaction),
    ));
  }
}
