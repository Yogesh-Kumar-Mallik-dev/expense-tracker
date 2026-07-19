import { prisma } from "@expense-tracker/db-main";
import { requireUser } from "../../../src/auth";
import { body, ok, route } from "../../../src/http";
import { createSchedule, materializeDueOccurrences } from "../../../src/phase4";
import { financialDateSchema, parseQuery } from "../../../src/query";
import { z } from "zod";

export const GET = route(async (request: Request) => {
  const userId = await requireUser(request);
  const through = parseQuery(
    z.object({
      through: financialDateSchema.default(
        new Date().toISOString().slice(0, 10),
      ),
    }),
    new URL(request.url),
    ["through"],
  ).through;
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
