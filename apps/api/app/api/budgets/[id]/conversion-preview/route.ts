import { previewBudgetModeConversion } from "@expense-tracker/services/budget";
import { requireUser } from "../../../../../src/auth";
import { HttpError, ok, route } from "../../../../../src/http";
import { services } from "../../../../../src/services";
import { z } from "zod";
import { body } from "../../../../../src/http";
import { convertBudgetMode } from "../../../../../src/budget-conversion";

type Context = { params: Promise<{ id: string }> };

export const GET = route(async (request: Request, context: Context) => {
  const userId = await requireUser(request);
  const budget = await services.budgets.get((await context.params).id, userId);
  if (!budget) throw new HttpError(404, "NOT_FOUND", "Budget not found");
  return ok(previewBudgetModeConversion(budget));
});

export const POST = route(async (request: Request, context: Context) => {
  const userId = await requireUser(request);
  const input = z.object({
    targetName: z.string().trim().min(1).max(120),
    targetAmount: z.string().regex(/^\d+(?:\.\d{1,4})?$/),
    targetRolloverPolicy: z.enum(["NONE", "POSITIVE_ONLY", "FULL"]),
    expectedSourceUpdatedAt: z.iso.datetime(),
  }).parse(await body(request));
  return ok(await convertBudgetMode((await context.params).id, userId, input), 201);
});
