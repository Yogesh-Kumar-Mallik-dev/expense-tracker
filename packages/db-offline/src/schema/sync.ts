import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { devices } from "./device";
import { users } from "./user";

export const syncStates = sqliteTable(
  "SyncState",
  {
    id: text("id").primaryKey().notNull(),
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    deviceId: text("deviceId").notNull().unique().references(() => devices.id, { onDelete: "cascade" }),
    lastSyncedAt: text("lastSyncedAt"),
    checkpoint: text("checkpoint"),
    createdAt: text("createdAt").notNull(),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [index("SyncState_userId_idx").on(table.userId)],
);

export type SyncState = typeof syncStates.$inferSelect;
export type NewSyncState = typeof syncStates.$inferInsert;
