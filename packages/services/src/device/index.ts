import { z } from "zod";
import type { Clock, IdFactory } from "../shared";
import { createUuid, parseUuid, systemClock } from "../shared";
export type DevicePlatform = "WEB" | "DESKTOP" | "IOS" | "ANDROID";
export interface DeviceRecord {
  id: string;
  userId: string;
  name: string;
  platform: DevicePlatform;
  lastSeenAt: string;
  createdAt: string;
  deletedAt: string | null;
}
export interface CreateDeviceInput {
  userId: string;
  name: string;
  platform: DevicePlatform;
}
export type UpdateDeviceInput = Partial<
  Pick<DeviceRecord, "name" | "platform" | "lastSeenAt">
>;
export interface DeviceRepositoryPort {
  create(v: DeviceRecord): Promise<unknown>;
  findById(id: string, userId: string): Promise<DeviceRecord | null>;
  listByUser(userId: string): Promise<DeviceRecord[]>;
  update(id: string, userId: string, v: UpdateDeviceInput): Promise<unknown>;
  delete(id: string, userId: string): Promise<unknown>;
}
const schema = z.object({
  userId: z.uuid(),
  name: z.string().trim().min(1).max(120),
  platform: z.enum(["WEB", "DESKTOP", "IOS", "ANDROID"]),
});
const update = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    platform: z.enum(["WEB", "DESKTOP", "IOS", "ANDROID"]).optional(),
    lastSeenAt: z.iso.datetime().optional(),
  })
  .refine((v) => Object.keys(v).length > 0);
export class DeviceService {
  constructor(
    private readonly repository: DeviceRepositoryPort,
    private readonly idFactory: IdFactory = createUuid,
    private readonly clock: Clock = systemClock,
  ) {}
  // Concurrency note: Safe single-row creation with a UUID; there is no shared device counter.
  async create(input: CreateDeviceInput) {
    const v = schema.parse(input);
    const now = this.clock();
    const record: DeviceRecord = {
      id: parseUuid(this.idFactory()),
      ...v,
      lastSeenAt: now,
      createdAt: now,
      deletedAt: null,
    };
    await this.repository.create(record);
    return record;
  }
  // Concurrency note: Safe read-only lookup.
  get(id: string, userId: string) {
    return this.repository.findById(z.uuid().parse(id), z.uuid().parse(userId));
  }
  // Concurrency note: Safe direct field replacement; lastSeenAt is informational and not a conflict-resolution clock.
  async update(id: string, userId: string, input: UpdateDeviceInput) {
    await this.repository.update(
      z.uuid().parse(id),
      z.uuid().parse(userId),
      update.parse(input) as UpdateDeviceInput,
    );
  }
  // Concurrency note: Safe idempotent single-row tombstone.
  async delete(id: string, userId: string) {
    await this.repository.delete(z.uuid().parse(id), z.uuid().parse(userId));
  }
  // Concurrency note: Safe read-only list; lastSeenAt ordering is presentation-only and subject to clock skew.
  list(userId: string) {
    return (this.repository as DeviceRepositoryPort).listByUser(
      z.uuid().parse(userId),
    );
  }
}
