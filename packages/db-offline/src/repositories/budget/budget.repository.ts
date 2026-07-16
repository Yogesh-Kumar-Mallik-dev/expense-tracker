import { and, desc, eq, gte, lte } from "drizzle-orm";
import type { OfflineDatabase } from "../../database";
import { budgets } from "../../schema";
import type { CreateBudgetInput, UpdateBudgetInput } from "./budget.types";

export class BudgetRepository {
  constructor(private readonly db: OfflineDatabase) {}

  create(data: CreateBudgetInput) {
    return this.db.insert(budgets).values(data);
  }

  async findById(id: string, userId: string) {
    return (await this.db.select().from(budgets).where(and(eq(budgets.id, id), eq(budgets.userId, userId))).limit(1))[0] ?? null;
  }

  listForPeriod(userId: string, from: string, to: string) {
    return this.db.select().from(budgets).where(and(
      eq(budgets.userId, userId),
      lte(budgets.startsOn, to),
      gte(budgets.endsOn, from),
    )).orderBy(desc(budgets.startsOn));
  }

  update(id: string, userId: string, data: UpdateBudgetInput) {
    return this.db.update(budgets).set(data).where(and(eq(budgets.id, id), eq(budgets.userId, userId)));
  }

  delete(id: string, userId: string) {
    return this.db.delete(budgets).where(and(eq(budgets.id, id), eq(budgets.userId, userId)));
  }
}
