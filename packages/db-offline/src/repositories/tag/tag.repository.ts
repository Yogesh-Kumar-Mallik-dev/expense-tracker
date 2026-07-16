import { and, asc, eq } from "drizzle-orm";
import type { OfflineDatabase } from "../../database";
import { tags } from "../../schema";
import type { CreateTagInput, UpdateTagInput } from "./tag.types";

export class TagRepository {
  constructor(private readonly db: OfflineDatabase) {}

  create(data: CreateTagInput) {
    return this.db.insert(tags).values(data);
  }

  async findById(id: string, userId: string) {
    return (await this.db.select().from(tags).where(and(eq(tags.id, id), eq(tags.userId, userId))).limit(1))[0] ?? null;
  }

  listByUser(userId: string) {
    return this.db.select().from(tags).where(eq(tags.userId, userId)).orderBy(asc(tags.name));
  }

  update(id: string, userId: string, data: UpdateTagInput) {
    return this.db.update(tags).set(data).where(and(eq(tags.id, id), eq(tags.userId, userId)));
  }

  delete(id: string, userId: string) {
    return this.db.delete(tags).where(and(eq(tags.id, id), eq(tags.userId, userId)));
  }
}
