import { eq } from "drizzle-orm";
import type { OfflineDatabase } from "../../database";
import { users } from "../../schema";
import type { CreateUserInput, UpdateUserInput } from "./user.types";

export class UserRepository {
  constructor(private readonly db: OfflineDatabase) {}

  create(data: CreateUserInput) {
    return this.db.insert(users).values(data);
  }

  async findById(id: string) {
    return (await this.db.select().from(users).where(eq(users.id, id)).limit(1))[0] ?? null;
  }

  async findByEmail(email: string) {
    return (await this.db.select().from(users).where(eq(users.email, email)).limit(1))[0] ?? null;
  }

  update(id: string, data: UpdateUserInput) {
    return this.db.update(users).set(data).where(eq(users.id, id));
  }

  delete(id: string) {
    return this.db.delete(users).where(eq(users.id, id));
  }
}
