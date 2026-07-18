import { z } from "zod";
import { requireUser } from "../../../../../src/auth";
import { body, HttpError, ok, route } from "../../../../../src/http";
import { services } from "../../../../../src/services";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({
  categoryId: z.uuid(),
  amount: z.string(),
  occurredAt: z.iso.date(),
  note: z.string().nullable().optional(),
});

export const GET = route(async (request: Request, context: Context) => {
  const userId = await requireUser(request);
  return ok(
    await services.budgetActivity.listAllocations(
      userId,
      (await context.params).id,
    ),
  );
});

export const POST = route(async (request: Request, context: Context) => {
  const userId = await requireUser(request);
  const { id: budgetId } = await context.params;
  const input = schema.parse(await body(request));
  if (!(await services.categories.get(input.categoryId, userId)))
    throw new HttpError(404, "NOT_FOUND", "Category not found");
  const assignments = await services.budgetCategories.list(budgetId, userId);
  if (!assignments.some((item) => item.categoryId === input.categoryId))
    throw new HttpError(
      400,
      "CATEGORY_NOT_ASSIGNED",
      "Category must be assigned to the envelope budget",
      ["categoryId"],
    );
  return ok(
    await services.budgetActivity.allocate(userId, {
      ...input,
      note: input.note ?? null,
      budgetId,
    }),
    201,
  );
});
