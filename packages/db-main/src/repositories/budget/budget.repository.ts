import { prisma, type PrismaClient } from "../../client";
import type { CreateBudgetInput, UpdateBudgetInput } from "./budget.types";

export class BudgetRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  create(data: CreateBudgetInput) {
    return this.db.budget.create({ data });
  }

  findById(id: string, userId: string) {
    return this.db.budget.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        categories: {
          where: { deletedAt: null, category: { deletedAt: null } },
          include: { category: true },
        },
      },
    });
  }

  listForPeriod(userId: string, from: Date, to: Date) {
    return this.db.budget.findMany({
      where: { userId, deletedAt: null, startsOn: { lte: to }, endsOn: { gte: from } },
      include: {
        categories: {
          where: { deletedAt: null, category: { deletedAt: null } },
          include: { category: true },
        },
      },
      orderBy: { startsOn: "desc" },
    });
  }

  update(id: string, userId: string, data: UpdateBudgetInput) {
    return this.db.budget.update({ where: { id, userId, deletedAt: null }, data });
  }

  delete(id: string, userId: string) {
    return this.db.budget.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
