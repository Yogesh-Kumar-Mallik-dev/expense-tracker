import { requireUser } from "../../../../src/auth";
import { ok, route } from "../../../../src/http";
import { financialPeriodQuerySchema, parseQuery } from "../../../../src/query";
import { services } from "../../../../src/services";
export const runtime = "nodejs";
export const GET = route(async (request: Request) => {
  const userId = await requireUser(request);
  const url = new URL(request.url);
  const { from, to } = parseQuery(
    financialPeriodQuerySchema,
    url,
    ["from", "to"],
    "INVALID_PERIOD",
  );
  return ok(await services.reporting.budgetUsage(userId, from, to));
});
