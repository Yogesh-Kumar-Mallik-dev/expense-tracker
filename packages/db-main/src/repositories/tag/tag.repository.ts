import { prisma, type PrismaClient } from "../../client";
import type { CreateTagInput, UpdateTagInput } from "./tag.types";

export class TagRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  create(data: CreateTagInput) {
    return this.db.tag.create({ data });
  }

  findById(id: string, userId: string) {
    return this.db.tag.findFirst({ where: { id, userId } });
  }

  listByUser(userId: string) {
    return this.db.tag.findMany({ where: { userId }, orderBy: { name: "asc" } });
  }

  update(id: string, userId: string, data: UpdateTagInput) {
    return this.db.tag.update({ where: { id, userId }, data });
  }

  delete(id: string, userId: string) {
    return this.db.tag.delete({ where: { id, userId } });
  }
}
