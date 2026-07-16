import { and, asc, eq } from "drizzle-orm";
import type { OfflineDatabase } from "../../database";
import { budgetCategories, budgets, categories } from "../../schema";
import type { CreateBudgetCategoryInput } from "./budgetCategory.types";

export class BudgetCategoryRepository {
  constructor(private readonly db: OfflineDatabase) {}

  create(data: CreateBudgetCategoryInput) {
    return this.db.insert(budgetCategories).values(data);
  }

  listByBudget(budgetId: string, userId: string) {
    return this.db
      .select({ assignment: budgetCategories, category: categories })
      .from(budgetCategories)
      .innerJoin(budgets, eq(budgetCategories.budgetId, budgets.id))
      .innerJoin(categories, eq(budgetCategories.categoryId, categories.id))
      .where(and(eq(budgetCategories.budgetId, budgetId), eq(budgets.userId, userId)))
      .orderBy(asc(budgetCategories.createdAt));
  }

  delete(budgetId: string, categoryId: string, userId: string) {
    const ownedBudget = this.db
      .select({ id: budgets.id })
      .from(budgets)
      .where(and(eq(budgets.id, budgetId), eq(budgets.userId, userId)));

    return this.db.delete(budgetCategories).where(and(
      eq(budgetCategories.budgetId, budgetId),
      eq(budgetCategories.categoryId, categoryId),
      eq(budgetCategories.budgetId, ownedBudget),
    ));
  }
}
