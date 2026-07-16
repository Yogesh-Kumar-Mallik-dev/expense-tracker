import { prisma, type PrismaClient } from "../../client";
import type { CategoryType } from "../../generated/prisma/enums";
import type { CreateCategoryInput, UpdateCategoryInput } from "./category.types";

export class CategoryRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  create(data: CreateCategoryInput) {
    return this.db.category.create({ data });
  }

  findById(id: string, userId: string) {
    return this.db.category.findFirst({ where: { id, userId } });
  }

  listByUser(userId: string, type?: CategoryType, includeArchived = false) {
    return this.db.category.findMany({
      where: {
        userId,
        ...(type ? { type } : {}),
        ...(includeArchived ? {} : { isArchived: false }),
      },
      include: { children: true },
      orderBy: { name: "asc" },
    });
  }

  update(id: string, userId: string, data: UpdateCategoryInput) {
    return this.db.category.update({ where: { id, userId }, data });
  }

  delete(id: string, userId: string) {
    return this.db.category.delete({ where: { id, userId } });
  }
}
