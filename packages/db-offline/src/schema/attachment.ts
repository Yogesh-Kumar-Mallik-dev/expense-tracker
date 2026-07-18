import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { transactions } from "./transaction";
import { users } from "./user";

export const attachments = sqliteTable(
  "Attachment",
  {
    id: text("id").primaryKey().notNull(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    transactionId: text("transactionId")
      .notNull()
      .references(() => transactions.id, { onDelete: "restrict" }),
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

export const pendingAttachmentUploads = sqliteTable(
  "PendingAttachmentUpload",
  {
    id: text("id").primaryKey().notNull(),
    userId: text("userId").notNull(),
    attachmentId: text("attachmentId").notNull().unique(),
    transactionId: text("transactionId").notNull(),
    localUri: text("localUri").notNull(),
    fileName: text("fileName").notNull(),
    mimeType: text("mimeType").notNull(),
    sizeBytes: integer("sizeBytes").notNull(),
    status: text("status").notNull().default("PENDING"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("lastError"),
    createdAt: text("createdAt").notNull(),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    index("PendingAttachmentUpload_userId_status_idx").on(
      table.userId,
      table.status,
    ),
  ],
);

export type PendingAttachmentUpload =
  typeof pendingAttachmentUploads.$inferSelect;
