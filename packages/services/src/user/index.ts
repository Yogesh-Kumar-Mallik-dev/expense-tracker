import { z } from "zod";
import { SingleRowService, type CrudRepositoryPort } from "../shared";
export interface UserRecord {
  id: string;
  email: string;
  name: string | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
export interface CreateUserInput {
  email: string;
  name?: string | null;
  currency?: string;
}
export type UpdateUserInput = Partial<
  Pick<UserRecord, "email" | "name" | "currency">
>;
export interface UserRepositoryPort extends CrudRepositoryPort<
  UserRecord,
  UpdateUserInput
> {
  findByEmail(email: string): Promise<UserRecord | null>;
}
const schema = z.object({
  email: z.email().transform((v) => v.toLowerCase()),
  name: z.string().trim().min(1).max(120).nullable().optional(),
  currency: z
    .string()
    .length(3)
    .transform((v) => v.toUpperCase())
    .default("USD"),
});
const update = schema.partial().refine((v) => Object.keys(v).length > 0);
export class UserService extends SingleRowService<
  UserRecord,
  CreateUserInput,
  UpdateUserInput
> {
  constructor(repository: UserRepositoryPort) {
    super(repository);
  }
  // Concurrency note: N/A - pure profile construction; authentication credentials are handled outside this service.
  protected build(input: CreateUserInput, id: string, now: string): UserRecord {
    const v = schema.parse(input);
    return {
      id,
      email: v.email,
      name: v.name ?? null,
      currency: v.currency,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
  }
  // Concurrency note: N/A - direct profile replacement validation with no stored-state computation.
  protected parseUpdate(input: UpdateUserInput) {
    return update.parse(input) as UpdateUserInput;
  }
  // Concurrency note: Safe read-only lookup; email uniqueness is enforced by the database, never check-then-insert here.
  findByEmail(email: string) {
    return (this.repository as UserRepositoryPort).findByEmail(
      z.email().parse(email).toLowerCase(),
    );
  }
}
