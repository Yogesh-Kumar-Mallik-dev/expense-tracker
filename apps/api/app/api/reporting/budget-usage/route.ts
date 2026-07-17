import { requireUser } from "../../../../src/auth";
import { HttpError, ok, route } from "../../../../src/http";
import { services } from "../../../../src/services";
export const runtime = "nodejs";
export const GET = route(async (request: Request) => {
  const userId = await requireUser(request);
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) throw new HttpError(400, "MISSING_PERIOD", "from and to are required");
  return ok(await services.reporting.budgetUsage(userId, from, to));
});
