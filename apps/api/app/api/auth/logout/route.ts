import { prisma } from "@expense-tracker/db-main";
import { z } from "zod";
import { requireUser } from "../../../../src/auth";
import { hashToken } from "../../../../src/auth/crypto";
import { body, empty, route } from "../../../../src/http";

const schema = z.object({ refreshToken: z.string().min(1) });

export const runtime = "nodejs";
export const POST = route(async (request: Request) => {
  const userId = await requireUser(request);
  const { refreshToken } = schema.parse(await body(request));
  await prisma.refreshToken.updateMany({
    where: { userId, tokenHash: hashToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return empty();
});
