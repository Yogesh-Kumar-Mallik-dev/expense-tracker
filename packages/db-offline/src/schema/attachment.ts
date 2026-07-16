import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { transactions } from "./transaction";
import { users } from "./user";

export const attachments = sqliteTable(
  "Attachment",
  {
    id: text("id").primaryKey().notNull(),
    userId: text("userId").notNull().references(() => users.id, { onDelete: "restrict" }),
    transactionId: text("transactionId").notNull().references(() => transactions.id, { onDelete: "restrict" }),
    fileName: text("fileName").notNull(),
    storageKey: text("storageKey").notNull().unique(),
    mimeType: text("mimeType").notNull(),
    sizeBytes: integer("sizeBytes").notNull(),
    createdAt: text("createdAt").notNull(),
    deletedAt: text("deletedAt"),
  },
  (table) => [
    index("Attachment_transactionId_idx").on(table.transactionId),
    index("Attachment_userId_idx").on(table.userId),
  ],
);

export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;
