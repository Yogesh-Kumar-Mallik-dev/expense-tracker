import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { budgets } from "./budget";
import { users } from "./user";

export const categoryTypes = ["EXPENSE", "INCOME"] as const;
export type CategoryType = (typeof categoryTypes)[number];

export const categories = sqliteTable(
  "Category",
  {
    id: text("id").primaryKey().notNull(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    parentId: text("parentId"),
    name: text("name").notNull(),
    type: text("type", { enum: categoryTypes }).notNull().default("EXPENSE"),
    color: text("color", { length: 7 }),
    icon: text("icon"),
    isArchived: integer("isArchived", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: text("createdAt").notNull(),
    updatedAt: text("updatedAt").notNull(),
    deletedAt: text("deletedAt"),
  },
  (table) => [
    uniqueIndex("Category_userId_name_type_active_key")
      .on(table.userId, table.name, table.type)
      .where(isNull(table.deletedAt)),
    index("Category_userId_type_isArchived_idx").on(
      table.userId,
      table.type,
      table.isArchived,
    ),
    index("Category_parentId_idx").on(table.parentId),
  ],
);

export const budgetCategories = sqliteTable(
  "BudgetCategory",
  {
    id: text("id").primaryKey().notNull(),
    budgetId: text("budgetId")
      .notNull()
      .references(() => budgets.id, { onDelete: "restrict" }),
    categoryId: text("categoryId")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    createdAt: text("createdAt").notNull(),
    deletedAt: text("deletedAt"),
  },
  (table) => [
    uniqueIndex("BudgetCategory_budgetId_categoryId_key").on(
      table.budgetId,
      table.categoryId,
    ),
    index("BudgetCategory_categoryId_idx").on(table.categoryId),
  ],
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type BudgetCategory = typeof budgetCategories.$inferSelect;
export type NewBudgetCategory = typeof budgetCategories.$inferInsert;
import { isNull } from "drizzle-orm";
