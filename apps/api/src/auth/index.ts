import { randomUUID } from "node:crypto";
import { prisma } from "@expense-tracker/db-main";
import { z } from "zod";
import { env } from "../env";
import { HttpError } from "../http";
import { hashToken, signToken, verifyToken } from "./crypto";

const ACCESS_SECONDS = 15 * 60;
const REFRESH_SECONDS = 30 * 24 * 60 * 60;

export async function requireUser(request: Request) {
  const match = /^Bearer (.+)$/i.exec(request.headers.get("authorization") ?? "");
  if (!match?.[1]) throw new HttpError(401, "UNAUTHORIZED", "A bearer token is required");
  const payload = verifyToken(match[1], env().ACCESS_TOKEN_SECRET, "access");
  if (!payload) throw new HttpError(401, "UNAUTHORIZED", "The access token is invalid or expired");
  const user = await prisma.user.findFirst({
    where: { id: payload.sub, deletedAt: null },
    select: { id: true },
  });
  if (!user) throw new HttpError(401, "UNAUTHORIZED", "The user is no longer active");
  return user.id;
}

export async function issueTokens(userId: string, deviceId?: string | null) {
  z.uuid().parse(userId);
  const now = Math.floor(Date.now() / 1000);
  const refreshId = randomUUID();
  const configuration = env();
  const accessToken = signToken(
    { sub: userId, type: "access", exp: now + ACCESS_SECONDS },
    configuration.ACCESS_TOKEN_SECRET,
  );
  const refreshToken = signToken(
    { sub: userId, type: "refresh", exp: now + REFRESH_SECONDS, jti: refreshId },
    configuration.REFRESH_TOKEN_SECRET,
  );
  await prisma.refreshToken.create({
    data: {
      id: refreshId,
      userId,
      ...(deviceId !== undefined ? { deviceId } : {}),
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date((now + REFRESH_SECONDS) * 1000),
    },
  });
  return { accessToken, refreshToken, expiresIn: ACCESS_SECONDS };
}

export async function rotateRefreshToken(token: string) {
  const payload = verifyToken(token, env().REFRESH_TOKEN_SECRET, "refresh");
  if (!payload?.jti) throw new HttpError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
  const tokenId = payload.jti;
  return prisma.$transaction(async (db) => {
    const stored = await db.refreshToken.findFirst({
      where: {
        id: tokenId,
        userId: payload.sub,
        tokenHash: hashToken(token),
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: { deletedAt: null },
      },
    });
    if (!stored) throw new HttpError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
    await db.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return { userId: payload.sub, deviceId: stored.deviceId };
  });
}
