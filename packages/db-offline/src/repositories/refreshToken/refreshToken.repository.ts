import { and, eq, gt, isNull, lt } from "drizzle-orm";
import type { OfflineDatabase } from "../../database";
import { refreshTokens } from "../../schema";
import type { CreateRefreshTokenInput } from "./refreshToken.types";

export class RefreshTokenRepository {
  constructor(private readonly db: OfflineDatabase) {}

  create(data: CreateRefreshTokenInput) {
    return this.db.insert(refreshTokens).values(data);
  }

  async findActiveByHash(tokenHash: string, now = new Date().toISOString()) {
    return (await this.db.select().from(refreshTokens).where(and(
      eq(refreshTokens.tokenHash, tokenHash),
      isNull(refreshTokens.revokedAt),
      gt(refreshTokens.expiresAt, now),
    )).limit(1))[0] ?? null;
  }

  revoke(id: string, userId: string, revokedAt = new Date().toISOString()) {
    return this.db.update(refreshTokens).set({ revokedAt }).where(and(eq(refreshTokens.id, id), eq(refreshTokens.userId, userId)));
  }

  revokeAllForUser(userId: string, revokedAt = new Date().toISOString()) {
    return this.db.update(refreshTokens).set({ revokedAt }).where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }

  deleteExpired(before = new Date().toISOString()) {
    return this.db.delete(refreshTokens).where(lt(refreshTokens.expiresAt, before));
  }
}
