import { requireUser } from "../../../../src/auth";
import { ok, route } from "../../../../src/http";
import { services } from "../../../../src/services";
export const runtime = "nodejs";
export const GET = route(async (request: Request) =>
  ok(await services.reporting.accountBalances(await requireUser(request))),
);
