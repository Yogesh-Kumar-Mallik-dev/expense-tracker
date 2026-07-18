import { prisma } from "@expense-tracker/db-main";
import { requireUser } from "../../../../../src/auth";
import { empty, ok, route } from "../../../../../src/http";

export const GET = route(async (request: Request) => {
  const userId = await requireUser(request);
  return ok(
    await prisma.dataDeletionRequest.findFirst({
      where: { userId, cancelledAt: null, completedAt: null },
      orderBy: { requestedAt: "desc" },
      select: { id: true, requestedAt: true, scheduledFor: true },
    }),
  );
});

export const DELETE = route(async (request: Request) => {
  const userId = await requireUser(request);
  await prisma.dataDeletionRequest.updateMany({
    where: { userId, cancelledAt: null, completedAt: null },
    data: { cancelledAt: new Date() },
  });
  return empty();
});
