import { prisma } from "@expense-tracker/db-main";
import { z } from "zod";
import { hashPassword } from "../../../../src/auth/crypto";
import { issueTokens } from "../../../../src/auth";
import { body, ok, route } from "../../../../src/http";

const schema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(200),
  name: z.string().trim().min(1).max(120).nullable().optional(),
  currency: z
    .string()
    .length(3)
    .transform((value) => value.toUpperCase())
    .default("USD"),
});

export const runtime = "nodejs";
export const POST = route(async (request: Request) => {
  const input = schema.parse(await body(request));
  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      ...(input.name !== undefined ? { name: input.name } : {}),
      currency: input.currency,
    },
    select: { id: true, email: true, name: true, currency: true },
  });
  return ok({ user, tokens: await issueTokens(user.id) }, 201);
});
