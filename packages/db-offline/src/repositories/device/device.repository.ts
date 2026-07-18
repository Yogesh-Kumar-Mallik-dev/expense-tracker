import { and, desc, eq, isNull } from "drizzle-orm";
import type { OfflineDatabase } from "../../database";
import { devices } from "../../schema";
import type { CreateDeviceInput, UpdateDeviceInput } from "./device.types";

export class DeviceRepository {
  constructor(private readonly db: OfflineDatabase) {}

  create(data: CreateDeviceInput) {
    return this.db.insert(devices).values(data);
  }

  async findById(id: string, userId: string) {
    return (
      (
        await this.db
          .select()
          .from(devices)
          .where(
            and(
              eq(devices.id, id),
              eq(devices.userId, userId),
              isNull(devices.deletedAt),
            ),
          )
          .limit(1)
      )[0] ?? null
    );
  }

  listByUser(userId: string) {
    return this.db
      .select()
      .from(devices)
      .where(and(eq(devices.userId, userId), isNull(devices.deletedAt)))
      .orderBy(desc(devices.lastSeenAt));
  }

  update(id: string, userId: string, data: UpdateDeviceInput) {
    return this.db
      .update(devices)
      .set(data)
      .where(
        and(
          eq(devices.id, id),
          eq(devices.userId, userId),
          isNull(devices.deletedAt),
        ),
      );
  }

  delete(id: string, userId: string) {
    return this.db
      .update(devices)
      .set({ deletedAt: new Date().toISOString() })
      .where(
        and(
          eq(devices.id, id),
          eq(devices.userId, userId),
          isNull(devices.deletedAt),
        ),
      );
  }
}
