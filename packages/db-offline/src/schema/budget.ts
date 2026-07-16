import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { users } from "./user";

export const budgets = sqliteTable(
  "Budget",
  {
    id: text("id").primaryKey().notNull(),
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    amount: text("amount").notNull(),
    currency: text("currency", { length: 3 }).notNull(),
    startsOn: text("startsOn").notNull(),
    endsOn: text("endsOn").notNull(),
    createdAt: text("createdAt").notNull(),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    uniqueIndex("Budget_userId_name_startsOn_endsOn_key").on(table.userId, table.name, table.startsOn, table.endsOn),
    index("Budget_userId_startsOn_endsOn_idx").on(table.userId, table.startsOn, table.endsOn),
  ],
);

export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
