import { prisma, type PrismaClient } from "../../client";
import type { CreateBudgetCategoryInput } from "./budgetCategory.types";

export class BudgetCategoryRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  create(data: CreateBudgetCategoryInput) {
    return this.db.budgetCategory.create({ data });
  }

  listByBudget(budgetId: string, userId: string) {
    return this.db.budgetCategory.findMany({
      where: { budgetId, budget: { userId } },
      include: { category: true },
      orderBy: { createdAt: "asc" },
    });
  }

  delete(budgetId: string, categoryId: string, userId: string) {
    return this.db.budgetCategory.delete({
      where: {
        budgetId_categoryId: { budgetId, categoryId },
        budget: { userId },
      },
    });
  }
}
