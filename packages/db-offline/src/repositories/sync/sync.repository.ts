import { and, desc, eq } from "drizzle-orm";
import type { OfflineDatabase } from "../../database";
import { syncStates } from "../../schema";
import type { CreateSyncStateInput } from "./sync.types";

export class SyncRepository {
  constructor(private readonly db: OfflineDatabase) {}

  create(data: CreateSyncStateInput) {
    return this.db.insert(syncStates).values(data);
  }

  async findByDevice(deviceId: string, userId: string) {
    return (await this.db.select().from(syncStates).where(and(eq(syncStates.deviceId, deviceId), eq(syncStates.userId, userId))).limit(1))[0] ?? null;
  }

  listByUser(userId: string) {
    return this.db.select().from(syncStates).where(eq(syncStates.userId, userId)).orderBy(desc(syncStates.updatedAt));
  }

  upsertForDevice(data: CreateSyncStateInput) {
    return this.db.insert(syncStates).values(data).onConflictDoUpdate({
      target: syncStates.deviceId,
      set: {
        checkpoint: data.checkpoint ?? null,
        lastSyncedAt: data.lastSyncedAt ?? null,
        updatedAt: data.updatedAt,
      },
    });
  }

  deleteByDevice(deviceId: string, userId: string) {
    return this.db.delete(syncStates).where(and(eq(syncStates.deviceId, deviceId), eq(syncStates.userId, userId)));
  }
}
