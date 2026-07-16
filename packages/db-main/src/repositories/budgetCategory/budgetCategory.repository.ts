import { prisma, type PrismaClient } from "../../client";
import type { CreateBudgetCategoryInput } from "./budgetCategory.types";

export class BudgetCategoryRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  create(data: CreateBudgetCategoryInput) {
    return this.db.budgetCategory.create({ data });
  }

  listByBudget(budgetId: string, userId: string) {
    return this.db.budgetCategory.findMany({
      where: {
        budgetId,
        deletedAt: null,
        budget: { userId, deletedAt: null },
        category: { deletedAt: null },
      },
      include: { category: true },
      orderBy: { createdAt: "asc" },
    });
  }

  delete(budgetId: string, categoryId: string, userId: string) {
    return this.db.budgetCategory.updateMany({
      where: {
        budgetId,
        categoryId,
        deletedAt: null,
        budget: { userId, deletedAt: null },
      },
      data: { deletedAt: new Date() },
    });
  }
}
