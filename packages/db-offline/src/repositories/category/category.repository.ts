import { and, asc, eq } from "drizzle-orm";
import type { OfflineDatabase } from "../../database";
import { categories, type CategoryType } from "../../schema";
import type { CreateCategoryInput, UpdateCategoryInput } from "./category.types";

export class CategoryRepository {
  constructor(private readonly db: OfflineDatabase) {}

  create(data: CreateCategoryInput) {
    return this.db.insert(categories).values(data);
  }

  async findById(id: string, userId: string) {
    return (await this.db.select().from(categories).where(and(eq(categories.id, id), eq(categories.userId, userId))).limit(1))[0] ?? null;
  }

  listByUser(userId: string, type?: CategoryType, includeArchived = false) {
    return this.db.select().from(categories).where(and(
      eq(categories.userId, userId),
      type ? eq(categories.type, type) : undefined,
      includeArchived ? undefined : eq(categories.isArchived, false),
    )).orderBy(asc(categories.name));
  }

  update(id: string, userId: string, data: UpdateCategoryInput) {
    return this.db.update(categories).set(data).where(and(eq(categories.id, id), eq(categories.userId, userId)));
  }

  delete(id: string, userId: string) {
    return this.db.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, userId)));
  }
}
