import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { accounts } from "./account";
import { categories } from "./category";
import { users } from "./user";

export const transactionTypes = ["EXPENSE", "INCOME", "TRANSFER"] as const;
export type TransactionType = (typeof transactionTypes)[number];

export const transactions = sqliteTable(
  "Transaction",
  {
    id: text("id").primaryKey().notNull(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    accountId: text("accountId")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    transferAccountId: text("transferAccountId").references(() => accounts.id, {
      onDelete: "restrict",
    }),
    categoryId: text("categoryId").references(() => categories.id, {
      onDelete: "set null",
    }),
    type: text("type", { enum: transactionTypes }).notNull(),
    amount: text("amount").notNull(),
    currency: text("currency", { length: 3 }).notNull(),
    description: text("description"),
    note: text("note"),
    importFingerprint: text("importFingerprint"),
    occurredAt: text("occurredAt").notNull(),
    createdAt: text("createdAt").notNull(),
    updatedAt: text("updatedAt").notNull(),
    deletedAt: text("deletedAt"),
  },
  (table) => [
    index("Transaction_userId_occurredAt_idx").on(
      table.userId,
      table.occurredAt,
    ),
    index("Transaction_accountId_occurredAt_idx").on(
      table.accountId,
      table.occurredAt,
    ),
    index("Transaction_categoryId_occurredAt_idx").on(
      table.categoryId,
      table.occurredAt,
    ),
    index("Transaction_transferAccountId_idx").on(table.transferAccountId),
    uniqueIndex("Transaction_userId_importFingerprint_active_key")
      .on(table.userId, table.importFingerprint)
      .where(
        sql`${table.deletedAt} is null and ${table.importFingerprint} is not null`,
      ),
  ],
);

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
