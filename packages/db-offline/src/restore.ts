import type { OfflineDatabase } from "./database";
import {
  accounts,
  attachments,
  budgetCategories,
  budgets,
  budgetTransfers,
  categories,
  envelopeAllocations,
  tags,
  transactionTags,
  transactions,
  users,
} from "./schema";

export interface OfflineBackupSnapshot {
  user: typeof users.$inferInsert;
  records: Record<string, unknown[]>;
}

export async function restoreBackupSnapshot(
  db: OfflineDatabase,
  snapshot: OfflineBackupSnapshot,
) {
  const records = snapshot.records;
  await db.transaction(async (tx) => {
    await tx.insert(users).values(snapshot.user);
    if (records.accounts?.length)
      await tx
        .insert(accounts)
        .values(records.accounts as (typeof accounts.$inferInsert)[]);
    if (records.categories?.length)
      await tx
        .insert(categories)
        .values(records.categories as (typeof categories.$inferInsert)[]);
    if (records.budgets?.length)
      await tx
        .insert(budgets)
        .values(records.budgets as (typeof budgets.$inferInsert)[]);
    if (records.budgetCategories?.length)
      await tx
        .insert(budgetCategories)
        .values(
          records.budgetCategories as (typeof budgetCategories.$inferInsert)[],
        );
    if (records.envelopeAllocations?.length)
      await tx
        .insert(envelopeAllocations)
        .values(
          records.envelopeAllocations as (typeof envelopeAllocations.$inferInsert)[],
        );
    if (records.budgetTransfers?.length)
      await tx
        .insert(budgetTransfers)
        .values(
          records.budgetTransfers as (typeof budgetTransfers.$inferInsert)[],
        );
    if (records.transactions?.length)
      await tx
        .insert(transactions)
        .values(records.transactions as (typeof transactions.$inferInsert)[]);
    if (records.tags?.length)
      await tx
        .insert(tags)
        .values(records.tags as (typeof tags.$inferInsert)[]);
    if (records.transactionTags?.length)
      await tx
        .insert(transactionTags)
        .values(
          records.transactionTags as (typeof transactionTags.$inferInsert)[],
        );
    if (records.attachments?.length)
      await tx
        .insert(attachments)
        .values(records.attachments as (typeof attachments.$inferInsert)[]);
  });
}
