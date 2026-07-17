import { z } from "zod";
import { requireUser } from "../../../../../src/auth";
import { body, empty, HttpError, ok, route } from "../../../../../src/http";
import { services } from "../../../../../src/services";
import { paginate } from "../../../../../src/pagination";
type Context = { params: Promise<{ id: string }> };
const schema = z.object({ tagId: z.uuid() });
export const runtime = "nodejs";
export const GET = route(async (request: Request, context: Context) => {
  const userId = await requireUser(request);
  const values = await services.transactionTags.list(
    (await context.params).id,
    userId,
  );
  const result = paginate(values, new URL(request.url));
  return ok(result.data, 200, result.meta);
});
export const POST = route(async (request: Request, context: Context) => {
  const userId = await requireUser(request);
  const input = schema.parse(await body(request));
  const transactionId = (await context.params).id;
  const [transaction, tag] = await Promise.all([
    services.transactions.get(transactionId, userId),
    services.tags.get(input.tagId, userId),
  ]);
  if (!transaction || !tag) {
    throw new HttpError(404, "NOT_FOUND", "Transaction or tag not found");
  }
  return ok(
    await services.transactionTags.create(transactionId, input.tagId),
    201,
  );
});
export const DELETE = route(async (request: Request, context: Context) => {
  const userId = await requireUser(request);
  const input = schema.parse(await body(request));
  await services.transactionTags.delete(
    (await context.params).id,
    input.tagId,
    userId,
  );
  return empty();
});
