import { prisma, type PrismaClient } from "../../client";
import type { CreateAccountInput, UpdateAccountInput } from "./account.types";

export class AccountRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  create(data: CreateAccountInput) {
    return this.db.account.create({ data });
  }

  findById(id: string, userId: string) {
    return this.db.account.findFirst({ where: { id, userId } });
  }

  listByUser(userId: string, includeArchived = false) {
    return this.db.account.findMany({
      where: { userId, ...(includeArchived ? {} : { isArchived: false }) },
      orderBy: { name: "asc" },
    });
  }

  update(id: string, userId: string, data: UpdateAccountInput) {
    return this.db.account.update({ where: { id, userId }, data });
  }

  delete(id: string, userId: string) {
    return this.db.account.delete({ where: { id, userId } });
  }
}
