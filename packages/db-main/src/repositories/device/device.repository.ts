import { prisma, type PrismaClient } from "../../client";
import type { CreateDeviceInput, UpdateDeviceInput } from "./device.types";

export class DeviceRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  create(data: CreateDeviceInput) {
    return this.db.device.create({ data });
  }

  findById(id: string, userId: string) {
    return this.db.device.findFirst({ where: { id, userId } });
  }

  listByUser(userId: string) {
    return this.db.device.findMany({ where: { userId }, orderBy: { lastSeenAt: "desc" } });
  }

  update(id: string, userId: string, data: UpdateDeviceInput) {
    return this.db.device.update({ where: { id, userId }, data });
  }

  delete(id: string, userId: string) {
    return this.db.device.delete({ where: { id, userId } });
  }
}
