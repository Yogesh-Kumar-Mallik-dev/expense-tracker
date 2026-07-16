import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { devices } from "./device";
import { users } from "./user";

export const refreshTokens = sqliteTable(
  "RefreshToken",
  {
    id: text("id").primaryKey().notNull(),
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    deviceId: text("deviceId").references(() => devices.id, { onDelete: "cascade" }),
    tokenHash: text("tokenHash").notNull().unique(),
    expiresAt: text("expiresAt").notNull(),
    revokedAt: text("revokedAt"),
    createdAt: text("createdAt").notNull(),
  },
  (table) => [
    index("RefreshToken_userId_expiresAt_idx").on(table.userId, table.expiresAt),
    index("RefreshToken_deviceId_idx").on(table.deviceId),
  ],
);

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
