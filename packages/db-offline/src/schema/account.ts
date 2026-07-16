import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { users } from "./user";

export const accountTypes = ["CASH", "CHECKING", "SAVINGS", "CREDIT_CARD", "WALLET", "OTHER"] as const;
export type AccountType = (typeof accountTypes)[number];

export const accounts = sqliteTable(
  "Account",
  {
    id: text("id").primaryKey().notNull(),
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type", { enum: accountTypes }).notNull().default("CASH"),
    currency: text("currency", { length: 3 }).notNull(),
    openingBalance: text("openingBalance").notNull().default("0"),
    color: text("color", { length: 7 }),
    icon: text("icon"),
    isArchived: integer("isArchived", { mode: "boolean" }).notNull().default(false),
    createdAt: text("createdAt").notNull(),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    uniqueIndex("Account_userId_name_key").on(table.userId, table.name),
    index("Account_userId_isArchived_idx").on(table.userId, table.isArchived),
  ],
);

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
