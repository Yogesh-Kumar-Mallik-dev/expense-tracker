import { requireUser } from "../../../../src/auth";
import { ok, route } from "../../../../src/http";
import { financialPeriodQuerySchema, parseQuery } from "../../../../src/query";
import { services } from "../../../../src/services";
import { prisma } from "@expense-tracker/db-main";

export const GET = route(async (request: Request) => {
  const userId = await requireUser(request);
  const url = new URL(request.url);
  const { from, to } = parseQuery(
    financialPeriodQuerySchema,
    url,
    ["from", "to"],
    "INVALID_PERIOD",
  );
  const profile = await prisma.user.findFirstOrThrow({
    where: { id: userId, deletedAt: null },
    select: { timezone: true },
  });
  return ok(
    await services.reporting.netWorthHistory(
      userId,
      from,
      to,
      profile.timezone,
    ),
  );
});
