import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./user";

export const devicePlatforms = ["WEB", "DESKTOP", "IOS", "ANDROID"] as const;
export type DevicePlatform = (typeof devicePlatforms)[number];

export const devices = sqliteTable(
  "Device",
  {
    id: text("id").primaryKey().notNull(),
    userId: text("userId").notNull().references(() => users.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    platform: text("platform", { enum: devicePlatforms }).notNull(),
    lastSeenAt: text("lastSeenAt").notNull(),
    createdAt: text("createdAt").notNull(),
    deletedAt: text("deletedAt"),
  },
  (table) => [index("Device_userId_idx").on(table.userId)],
);

export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;
