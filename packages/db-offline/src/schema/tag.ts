import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { transactions } from "./transaction";
import { users } from "./user";

export const tags = sqliteTable(
  "Tag",
  {
    id: text("id").primaryKey().notNull(),
    userId: text("userId").notNull().references(() => users.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    color: text("color", { length: 7 }),
    createdAt: text("createdAt").notNull(),
    updatedAt: text("updatedAt").notNull(),
    deletedAt: text("deletedAt"),
  },
  (table) => [
    uniqueIndex("Tag_userId_name_active_key")
      .on(table.userId, table.name)
      .where(isNull(table.deletedAt)),
    index("Tag_userId_idx").on(table.userId),
  ],
);

export const transactionTags = sqliteTable(
  "TransactionTag",
  {
    id: text("id").primaryKey().notNull(),
    transactionId: text("transactionId").notNull().references(() => transactions.id, { onDelete: "restrict" }),
    tagId: text("tagId").notNull().references(() => tags.id, { onDelete: "restrict" }),
    createdAt: text("createdAt").notNull(),
    deletedAt: text("deletedAt"),
  },
  (table) => [
    uniqueIndex("TransactionTag_transactionId_tagId_key").on(table.transactionId, table.tagId),
    index("TransactionTag_tagId_idx").on(table.tagId),
  ],
);

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type TransactionTag = typeof transactionTags.$inferSelect;
export type NewTransactionTag = typeof transactionTags.$inferInsert;
import { isNull } from "drizzle-orm";
