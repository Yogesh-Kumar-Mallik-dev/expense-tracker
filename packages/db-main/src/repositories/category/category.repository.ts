import { prisma, type PrismaClient } from "../../client";
import type { CategoryType } from "../../generated/prisma/enums";
import type { CreateCategoryInput, UpdateCategoryInput } from "./category.types";

export class CategoryRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  create(data: CreateCategoryInput) {
    return this.db.category.create({ data });
  }

  findById(id: string, userId: string) {
    return this.db.category.findFirst({ where: { id, userId, deletedAt: null } });
  }

  listByUser(userId: string, type?: CategoryType, includeArchived = false) {
    return this.db.category.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(type ? { type } : {}),
        ...(includeArchived ? {} : { isArchived: false }),
      },
      include: { children: { where: { deletedAt: null } } },
      orderBy: { name: "asc" },
    });
  }

  update(id: string, userId: string, data: UpdateCategoryInput) {
    return this.db.category.update({ where: { id, userId, deletedAt: null }, data });
  }

  delete(id: string, userId: string) {
    return this.db.category.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
