import { requireUser } from "../../../../src/auth";
import { body, empty, HttpError, ok, route } from "../../../../src/http";
import { services } from "../../../../src/services";
import { prisma } from "@expense-tracker/db-main";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const GET = route(async (request: Request) => {
  const userId = await requireUser(request);
  const user = await services.users.get(userId, userId);
  if (!user) throw new HttpError(404, "NOT_FOUND", "User not found");
  return ok(user);
});
export const PATCH = route(async (request: Request) => {
  const userId = await requireUser(request);
  await services.users.update(userId, userId, await body(request));
  return empty();
});
export const DELETE = route(async (request: Request) => {
  const userId = await requireUser(request);
  const scheduledFor = new Date(Date.now() + 30 * 86_400_000);
  const deletion = await prisma.$transaction(async (tx) => {
    const existing = await tx.dataDeletionRequest.findFirst({
      where: { userId, cancelledAt: null, completedAt: null },
      orderBy: { requestedAt: "desc" },
      select: { id: true, scheduledFor: true },
    });
    if (existing) return existing;
    await tx.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return tx.dataDeletionRequest.create({
      data: { id: randomUUID(), userId, scheduledFor },
      select: { id: true, scheduledFor: true },
    });
  });
  return ok(deletion, 202);
});
