import { prisma, type PrismaClient } from "../../client";
import type { CreateSyncStateInput } from "./sync.types";

export class SyncRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  create(data: CreateSyncStateInput) {
    return this.db.syncState.create({ data });
  }

  findByDevice(deviceId: string, userId: string) {
    return this.db.syncState.findFirst({ where: { deviceId, userId } });
  }

  listByUser(userId: string) {
    return this.db.syncState.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } });
  }

  upsertForDevice(
    deviceId: string,
    userId: string,
    checkpoint: string | null,
    lastSyncedAt = new Date(),
  ) {
    return this.db.syncState.upsert({
      where: { deviceId },
      create: { deviceId, userId, checkpoint, lastSyncedAt },
      update: { checkpoint, lastSyncedAt },
    });
  }

  deleteByDevice(deviceId: string, userId: string) {
    return this.db.syncState.delete({ where: { deviceId, userId } });
  }
}
