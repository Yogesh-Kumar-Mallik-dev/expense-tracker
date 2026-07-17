import { previewBudgetModeConversion } from "@expense-tracker/services/budget";
import { requireUser } from "../../../../../src/auth";
import { HttpError, ok, route } from "../../../../../src/http";
import { services } from "../../../../../src/services";

type Context = { params: Promise<{ id: string }> };

export const GET = route(async (request: Request, context: Context) => {
  const userId = await requireUser(request);
  const budget = await services.budgets.get((await context.params).id, userId);
  if (!budget) throw new HttpError(404, "NOT_FOUND", "Budget not found");
  return ok(previewBudgetModeConversion(budget));
});

export const POST = route(async (request: Request, context: Context) => {
  const userId = await requireUser(request);
  return ok(
    await services.budgets.convertMode((await context.params).id, userId),
    201,
  );
});
