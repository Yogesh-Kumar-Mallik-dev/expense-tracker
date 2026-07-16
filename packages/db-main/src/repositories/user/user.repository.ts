import { prisma, type PrismaClient } from "../../client";
import type { CreateUserInput, UpdateUserInput } from "./user.types";

export class UserRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  create(data: CreateUserInput) {
    return this.db.user.create({ data });
  }

  findById(id: string) {
    return this.db.user.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return this.db.user.findUnique({ where: { email } });
  }

  update(id: string, data: UpdateUserInput) {
    return this.db.user.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.db.user.delete({ where: { id } });
  }
}
