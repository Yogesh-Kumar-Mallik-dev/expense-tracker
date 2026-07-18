import { z } from "zod";
import { requireUser } from "../../../../../src/auth";
import { body, HttpError, ok, route } from "../../../../../src/http";
import { services } from "../../../../../src/services";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({
  fromCategoryId: z.uuid().nullable(),
  toCategoryId: z.uuid().nullable(),
  amount: z.string(),
  occurredAt: z.iso.date(),
  note: z.string().nullable().optional(),
});

export const GET = route(async (request: Request, context: Context) => {
  const userId = await requireUser(request);
  return ok(
    await services.budgetActivity.listTransfers(
      userId,
      (await context.params).id,
    ),
  );
});

export const POST = route(async (request: Request, context: Context) => {
  const userId = await requireUser(request);
  const { id: budgetId } = await context.params;
  const input = schema.parse(await body(request));
  const categoryIds = [input.fromCategoryId, input.toCategoryId].filter(
    (value): value is string => Boolean(value),
  );
  const owned = await Promise.all(
    categoryIds.map((id) => services.categories.get(id, userId)),
  );
  if (owned.some((category) => !category))
    throw new HttpError(404, "NOT_FOUND", "Category not found");
  const assignments = await services.budgetCategories.list(budgetId, userId);
  const assignedIds = new Set(assignments.map((item) => item.categoryId));
  if (categoryIds.some((id) => !assignedIds.has(id)))
    throw new HttpError(
      400,
      "CATEGORY_NOT_ASSIGNED",
      "Transfer categories must be assigned to the envelope budget",
      ["fromCategoryId", "toCategoryId"],
    );
  return ok(
    await services.budgetActivity.transfer(userId, {
      ...input,
      note: input.note ?? null,
      budgetId,
    }),
    201,
  );
});
