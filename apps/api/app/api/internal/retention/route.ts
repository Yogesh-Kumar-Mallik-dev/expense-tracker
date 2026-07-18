import { createHash } from "node:crypto";
import { prisma } from "@expense-tracker/db-main";
import { HttpError, ok, route } from "../../../../src/http";

export const POST = route(async (request: Request) => {
  const secret = process.env.RETENTION_JOB_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    throw new HttpError(401, "UNAUTHORIZED", "Invalid retention credential");
  const due = await prisma.dataDeletionRequest.findMany({
    where: {
      scheduledFor: { lte: new Date() },
      cancelledAt: null,
      completedAt: null,
    },
  });
  for (const request of due)
    await prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.refreshToken.deleteMany({ where: { userId: request.userId } });
      await tx.device.updateMany({
        where: { userId: request.userId, deletedAt: null },
        data: { deletedAt: now },
      });
      await tx.transaction.updateMany({
        where: { userId: request.userId },
        data: {
          description: null,
          note: null,
          importFingerprint: null,
          deletedAt: now,
        },
      });
      const attachments = await tx.attachment.findMany({
        where: { userId: request.userId },
        select: { id: true },
      });
      for (const attachment of attachments)
        await tx.attachment.update({
          where: { id: attachment.id },
          data: {
            fileName: "deleted",
            storageKey: `deleted/${request.userId}/${attachment.id}`,
            deletedAt: now,
          },
        });
      await tx.transactionSchedule.updateMany({
        where: { userId: request.userId },
        data: {
          description: null,
          note: null,
          isActive: false,
          deletedAt: now,
        },
      });
      await tx.account.updateMany({
        where: { userId: request.userId },
        data: { name: "Deleted account", deletedAt: now },
      });
      await tx.category.updateMany({
        where: { userId: request.userId },
        data: { name: "Deleted category", deletedAt: now },
      });
      await tx.budget.updateMany({
        where: { userId: request.userId },
        data: { name: "Deleted budget", deletedAt: now },
      });
      await tx.tag.updateMany({
        where: { userId: request.userId },
        data: { name: "Deleted tag", deletedAt: now },
      });
      await tx.user.update({
        where: { id: request.userId },
        data: {
          email: `deleted-${createHash("sha256").update(request.userId).digest("hex")}@invalid.local`,
          passwordHash: "deleted",
          name: null,
          deletedAt: now,
        },
      });
      await tx.dataDeletionRequest.update({
        where: { id: request.id },
        data: { completedAt: now },
      });
    });
  return ok({ completed: due.length });
});
