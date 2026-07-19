import { requireUser } from "../../../../src/auth";
import { ok, route } from "../../../../src/http";
import { instantPeriodQuerySchema, parseQuery } from "../../../../src/query";
import { services } from "../../../../src/services";

export const GET = route(async (request: Request) => {
  const userId = await requireUser(request);
  const url = new URL(request.url);
  const { from, to } = parseQuery(
    instantPeriodQuerySchema,
    url,
    ["from", "to"],
    "INVALID_PERIOD",
  );
  return ok(await services.reporting.categorySpending(userId, from, to));
});
