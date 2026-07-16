import { prisma, type PrismaClient } from "../../client";
import type { CreateRefreshTokenInput } from "./refreshToken.types";

export class RefreshTokenRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  create(data: CreateRefreshTokenInput) {
    return this.db.refreshToken.create({ data });
  }

  findActiveByHash(tokenHash: string, now = new Date()) {
    return this.db.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: now } },
    });
  }

  revoke(id: string, userId: string, revokedAt = new Date()) {
    return this.db.refreshToken.update({ where: { id, userId }, data: { revokedAt } });
  }

  revokeAllForUser(userId: string, revokedAt = new Date()) {
    return this.db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt },
    });
  }

  deleteExpired(before = new Date()) {
    return this.db.refreshToken.deleteMany({ where: { expiresAt: { lt: before } } });
  }
}
