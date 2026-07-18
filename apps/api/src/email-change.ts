import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@expense-tracker/db-main";
import { env } from "./env";
import { HttpError } from "./http";

const TTL_MS = 30 * 60 * 1000;
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export async function requestEmailChange(userId: string, email: string) {
  const normalized = email.trim().toLowerCase();
  const duplicate = await prisma.user.findFirst({
    where: { email: normalized, deletedAt: null, NOT: { id: userId } },
    select: { id: true },
  });
  if (duplicate)
    throw new HttpError(
      409,
      "EMAIL_IN_USE",
      "That email address is already in use",
    );
  const token = randomBytes(32).toString("base64url");
  const record = await prisma.$transaction(async (db) => {
    await db.emailChangeToken.deleteMany({ where: { userId, usedAt: null } });
    return db.emailChangeToken.create({
      data: {
        userId,
        email: normalized,
        tokenHash: hash(token),
        expiresAt: new Date(Date.now() + TTL_MS),
      },
    });
  });
  const configuration = env();
  const verificationUrl = `${configuration.WEB_APP_URL.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(token)}`;
  if (configuration.RESEND_API_KEY && configuration.EMAIL_FROM) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${configuration.RESEND_API_KEY}`,
        "content-type": "application/json",
        "user-agent": "expense-tracker-api/1.0",
        "idempotency-key": record.id,
      },
      body: JSON.stringify({
        from: configuration.EMAIL_FROM,
        to: [normalized],
        subject: "Confirm your Expense Tracker email",
        text: `Confirm your email change within 30 minutes:\n\n${verificationUrl}`,
      }),
    });
    if (!response.ok)
      throw new HttpError(
        502,
        "EMAIL_DELIVERY_FAILED",
        "Verification email could not be sent",
      );
    return { delivery: "email" as const };
  }
  if (process.env.NODE_ENV === "production")
    throw new HttpError(
      503,
      "EMAIL_NOT_CONFIGURED",
      "Email delivery is not configured",
    );
  return {
    delivery: "development" as const,
    developmentVerificationUrl: verificationUrl,
  };
}

export async function confirmEmailChange(token: string) {
  return prisma.$transaction(async (db) => {
    const value = await db.emailChangeToken.findFirst({
      where: {
        tokenHash: hash(token),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!value)
      throw new HttpError(
        400,
        "INVALID_EMAIL_TOKEN",
        "Verification link is invalid or expired",
      );
    const duplicate = await db.user.findFirst({
      where: { email: value.email, deletedAt: null, NOT: { id: value.userId } },
      select: { id: true },
    });
    if (duplicate)
      throw new HttpError(
        409,
        "EMAIL_IN_USE",
        "That email address is already in use",
      );
    const used = await db.emailChangeToken.updateMany({
      where: { id: value.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (used.count !== 1)
      throw new HttpError(
        400,
        "INVALID_EMAIL_TOKEN",
        "Verification link has already been used",
      );
    await db.user.update({
      where: { id: value.userId },
      data: { email: value.email },
    });
    await db.refreshToken.updateMany({
      where: { userId: value.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { email: value.email };
  });
}
