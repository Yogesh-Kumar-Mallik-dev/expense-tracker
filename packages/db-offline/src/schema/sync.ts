import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { devices } from "./device";
import { users } from "./user";

export const syncStates = sqliteTable(
  "SyncState",
  {
    id: text("id").primaryKey().notNull(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    deviceId: text("deviceId")
      .notNull()
      .unique()
      .references(() => devices.id, { onDelete: "restrict" }),
    lastSyncedAt: text("lastSyncedAt"),
    checkpoint: text("checkpoint"),
    createdAt: text("createdAt").notNull(),
    updatedAt: text("updatedAt").notNull(),
    deletedAt: text("deletedAt"),
  },
  (table) => [index("SyncState_userId_idx").on(table.userId)],
);

export type SyncState = typeof syncStates.$inferSelect;
export type NewSyncState = typeof syncStates.$inferInsert;

export const syncConflicts = sqliteTable(
  "SyncConflict",
  {
    id: text("id").primaryKey().notNull(),
    crudTransactionId: text("crudTransactionId").notNull(),
    entity: text("entity").notNull(),
    recordId: text("recordId").notNull(),
    operation: text("operation").notNull(),
    kind: text("kind").notNull(),
    fields: text("fields").notNull().default("[]"),
    message: text("message").notNull(),
    recovery: text("recovery").notNull(),
    createdAt: text("createdAt").notNull(),
    resolvedAt: text("resolvedAt"),
  },
  (table) => [
    index("SyncConflict_recordId_idx").on(table.entity, table.recordId),
    index("SyncConflict_resolvedAt_idx").on(table.resolvedAt),
  ],
);

export type SyncConflict = typeof syncConflicts.$inferSelect;
export type NewSyncConflict = typeof syncConflicts.$inferInsert;
