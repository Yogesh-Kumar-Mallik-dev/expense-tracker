import { prisma } from "@expense-tracker/db-main";
import { z } from "zod";
import { issueTokens } from "../../../../src/auth";
import { verifyPassword } from "../../../../src/auth/crypto";
import { body, HttpError, ok, route } from "../../../../src/http";

const schema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(200),
  deviceId: z.uuid().nullable().optional(),
});

export const runtime = "nodejs";
export const POST = route(async (request: Request) => {
  const input = schema.parse(await body(request));
  const user = await prisma.user.findFirst({
    where: { email: input.email, deletedAt: null },
  });
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
  }
  return ok({
    user: { id: user.id, email: user.email, name: user.name, currency: user.currency },
    tokens: await issueTokens(user.id, input.deviceId),
  });
});
