import { and, asc, eq, isNull } from "drizzle-orm";
import type { OfflineDatabase } from "../../database";
import { accounts } from "../../schema";
import type { CreateAccountInput, UpdateAccountInput } from "./account.types";

export class AccountRepository {
  constructor(private readonly db: OfflineDatabase) {}

  create(data: CreateAccountInput) {
    return this.db.insert(accounts).values(data);
  }

  async findById(id: string, userId: string) {
    return (await this.db.select().from(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, userId), isNull(accounts.deletedAt))).limit(1))[0] ?? null;
  }

  listByUser(userId: string, includeArchived = false) {
    return this.db.select().from(accounts).where(
      includeArchived
        ? and(eq(accounts.userId, userId), isNull(accounts.deletedAt))
        : and(eq(accounts.userId, userId), eq(accounts.isArchived, false), isNull(accounts.deletedAt)),
    ).orderBy(asc(accounts.name));
  }

  update(id: string, userId: string, data: UpdateAccountInput) {
    return this.db.update(accounts).set(data).where(and(eq(accounts.id, id), eq(accounts.userId, userId), isNull(accounts.deletedAt)));
  }

  delete(id: string, userId: string) {
    return this.db.update(accounts).set({ deletedAt: new Date().toISOString() }).where(and(eq(accounts.id, id), eq(accounts.userId, userId), isNull(accounts.deletedAt)));
  }
}
