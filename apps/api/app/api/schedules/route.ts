import { prisma } from "@expense-tracker/db-main";
import { requireUser } from "../../../src/auth";
import { body, ok, route } from "../../../src/http";
import { createSchedule, materializeDueOccurrences } from "../../../src/phase4";

export const GET = route(async (request: Request) => {
  const userId = await requireUser(request);
  const through =
    new URL(request.url).searchParams.get("through") ??
    new Date().toISOString().slice(0, 10);
  await materializeDueOccurrences(userId, through);
  return ok(
    await prisma.transactionSchedule.findMany({
      where: { userId, deletedAt: null },
      include: {
        occurrences: {
          where: {
            status: "DUE",
            occurrenceDate: { lte: new Date(`${through}T00:00:00Z`) },
          },
          orderBy: { occurrenceDate: "asc" },
        },
      },
      orderBy: { nextOccurrenceOn: "asc" },
    }),
  );
});

export const POST = route(async (request: Request) =>
  ok(
    await createSchedule(await requireUser(request), await body(request)),
    201,
  ),
);
