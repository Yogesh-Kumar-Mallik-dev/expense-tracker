import { z } from "zod";
import { requireUser } from "../../../../../src/auth";
import { body, empty, HttpError, ok, route } from "../../../../../src/http";
import { services } from "../../../../../src/services";
type Context = { params: Promise<{ id: string }> };
const schema = z.object({ categoryId: z.uuid() });
export const runtime = "nodejs";
export const GET = route(async (request: Request, context: Context) => {
  const userId = await requireUser(request);
  return ok(await services.budgetCategories.list((await context.params).id, userId));
});
export const POST = route(async (request: Request, context: Context) => {
  const userId = await requireUser(request);
  const input = schema.parse(await body(request));
  const budgetId = (await context.params).id;
  const [budget, category] = await Promise.all([
    services.budgets.get(budgetId, userId),
    services.categories.get(input.categoryId, userId),
  ]);
  if (!budget || !category) {
    throw new HttpError(404, "NOT_FOUND", "Budget or category not found");
  }
  return ok(await services.budgetCategories.create(budgetId, input.categoryId), 201);
});
export const DELETE = route(async (request: Request, context: Context) => {
  const userId = await requireUser(request);
  const input = schema.parse(await body(request));
  await services.budgetCategories.delete((await context.params).id, input.categoryId, userId);
  return empty();
});
