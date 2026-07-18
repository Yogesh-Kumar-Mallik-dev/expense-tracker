import { randomUUID } from "node:crypto";
import { prisma } from "@expense-tracker/db-main";
import { HttpError } from "./http";

export interface ConfirmedBudgetConversion {
  targetName: string;
  targetAmount: string;
  targetRolloverPolicy: "NONE" | "POSITIVE_ONLY" | "FULL";
  expectedSourceUpdatedAt: string;
}

export async function convertBudgetMode(
  budgetId: string,
  userId: string,
  input: ConfirmedBudgetConversion,
) {
  return prisma.$transaction(async (db) => {
    const source = await db.budget.findFirst({
      where: { id: budgetId, userId, deletedAt: null },
      include: { categories: { where: { deletedAt: null } } },
    });
    if (!source) throw new HttpError(404, "NOT_FOUND", "Budget not found");
    if (source.updatedAt.toISOString() !== input.expectedSourceUpdatedAt)
      throw new HttpError(
        409,
        "BUDGET_CHANGED",
        "The budget changed after the conversion preview was loaded",
      );
    const now = new Date();
    const target = await db.budget.create({
      data: {
        id: randomUUID(),
        userId,
        name: input.targetName,
        amount: input.targetAmount,
        currency: source.currency,
        startsOn: source.startsOn,
        endsOn: source.endsOn,
        mode: source.mode === "ENVELOPE" ? "SPENDING_LIMIT" : "ENVELOPE",
        rolloverPolicy: input.targetRolloverPolicy,
        createdAt: now,
        updatedAt: now,
        categories: {
          create: source.categories.map((assignment) => ({
            id: randomUUID(),
            categoryId: assignment.categoryId,
            createdAt: now,
          })),
        },
      },
    });
    const archived = await db.budget.updateMany({
      where: {
        id: source.id,
        userId,
        deletedAt: null,
        updatedAt: source.updatedAt,
      },
      data: { deletedAt: now, updatedAt: now },
    });
    if (archived.count !== 1)
      throw new HttpError(409, "BUDGET_CHANGED", "The source budget changed");
    return {
      sourceId: source.id,
      target: {
        ...target,
        amount: target.amount.toString(),
        startsOn: target.startsOn.toISOString().slice(0, 10),
        endsOn: target.endsOn.toISOString().slice(0, 10),
        createdAt: target.createdAt.toISOString(),
        updatedAt: target.updatedAt.toISOString(),
        deletedAt: null,
      },
    };
  });
}
