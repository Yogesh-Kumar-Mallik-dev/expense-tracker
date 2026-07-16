import { prisma, type PrismaClient } from "../../client";
import type { CreateUserInput, UpdateUserInput } from "./user.types";

export class UserRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  create(data: CreateUserInput) {
    return this.db.user.create({ data });
  }

  findById(id: string) {
    return this.db.user.findFirst({ where: { id, deletedAt: null } });
  }

  findByEmail(email: string) {
    return this.db.user.findFirst({ where: { email, deletedAt: null } });
  }

  update(id: string, data: UpdateUserInput) {
    return this.db.user.update({ where: { id, deletedAt: null }, data });
  }

  delete(id: string) {
    return this.db.user.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
