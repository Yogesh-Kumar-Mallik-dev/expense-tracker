import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { users } from "./user";

export const budgets = sqliteTable(
  "Budget",
  {
    id: text("id").primaryKey().notNull(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    amount: text("amount").notNull(),
    currency: text("currency", { length: 3 }).notNull(),
    startsOn: text("startsOn").notNull(),
    endsOn: text("endsOn").notNull(),
    mode: text("mode", { enum: ["SPENDING_LIMIT", "ENVELOPE"] })
      .notNull()
      .default("SPENDING_LIMIT"),
    rolloverPolicy: text("rolloverPolicy", {
      enum: ["NONE", "POSITIVE_ONLY", "FULL"],
    })
      .notNull()
      .default("NONE"),
    createdAt: text("createdAt").notNull(),
    updatedAt: text("updatedAt").notNull(),
    deletedAt: text("deletedAt"),
  },
  (table) => [
    uniqueIndex("Budget_userId_name_startsOn_endsOn_key").on(
      table.userId,
      table.name,
      table.startsOn,
      table.endsOn,
    ),
    index("Budget_userId_startsOn_endsOn_idx").on(
      table.userId,
      table.startsOn,
      table.endsOn,
    ),
  ],
);

export const envelopeAllocations = sqliteTable(
  "EnvelopeAllocation",
  {
    id: text("id").primaryKey().notNull(),
    budgetId: text("budgetId")
      .notNull()
      .references(() => budgets.id, { onDelete: "restrict" }),
    categoryId: text("categoryId").notNull(),
    amount: text("amount").notNull(),
    occurredAt: text("occurredAt").notNull(),
    note: text("note"),
    createdAt: text("createdAt").notNull(),
    deletedAt: text("deletedAt"),
  },
  (table) => [
    index("EnvelopeAllocation_budgetId_categoryId_occurredAt_idx").on(
      table.budgetId,
      table.categoryId,
      table.occurredAt,
    ),
  ],
);

export const budgetTransfers = sqliteTable(
  "BudgetTransfer",
  {
    id: text("id").primaryKey().notNull(),
    budgetId: text("budgetId")
      .notNull()
      .references(() => budgets.id, { onDelete: "restrict" }),
    fromCategoryId: text("fromCategoryId"),
    toCategoryId: text("toCategoryId"),
    amount: text("amount").notNull(),
    occurredAt: text("occurredAt").notNull(),
    note: text("note"),
    createdAt: text("createdAt").notNull(),
    deletedAt: text("deletedAt"),
  },
  (table) => [
    index("BudgetTransfer_budgetId_occurredAt_idx").on(
      table.budgetId,
      table.occurredAt,
    ),
  ],
);

export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
export type EnvelopeAllocation = typeof envelopeAllocations.$inferSelect;
export type BudgetTransfer = typeof budgetTransfers.$inferSelect;
