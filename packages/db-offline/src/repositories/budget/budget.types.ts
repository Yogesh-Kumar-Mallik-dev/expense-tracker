import type { NewBudget } from "../../schema";

export type CreateBudgetInput = NewBudget;
export type UpdateBudgetInput = Partial<Omit<NewBudget, "id" | "userId" | "createdAt">>;
