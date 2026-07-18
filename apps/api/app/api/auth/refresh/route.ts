import { z } from "zod";
import { prisma } from "@expense-tracker/db-main";
import { rotateRefreshToken } from "../../../../src/auth";
import { body, ok, route } from "../../../../src/http";

const schema = z.object({ refreshToken: z.string().min(1) });

export const runtime = "nodejs";
export const POST = route(async (request: Request) => {
  const { refreshToken } = schema.parse(await body(request));
  const rotated = await rotateRefreshToken(refreshToken);
  const user = await prisma.user.findFirstOrThrow({
    where: { id: rotated.userId, deletedAt: null },
  });
  return ok({ user, tokens: rotated.tokens });
});
