import { z } from "zod";
import { SingleRowService, type CrudRepositoryPort } from "../shared";
export interface TagRecord {
  id: string;
  userId: string;
  name: string;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
export interface CreateTagInput {
  userId: string;
  name: string;
  color?: string | null;
}
export type UpdateTagInput = Partial<Pick<TagRecord, "name" | "color">>;
export interface TagRepositoryPort extends CrudRepositoryPort<
  TagRecord,
  UpdateTagInput
> {
  listByUser(userId: string): Promise<TagRecord[]>;
}
export const createTagSchema = z.object({
  userId: z.uuid(),
  name: z.string().trim().min(1).max(80),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable()
    .optional(),
});
export const updateTagSchema = createTagSchema
  .omit({ userId: true })
  .partial()
  .refine((v) => Object.keys(v).length > 0);
export class TagService extends SingleRowService<
  TagRecord,
  CreateTagInput,
  UpdateTagInput
> {
  constructor(repository: TagRepositoryPort) {
    super(repository);
  }
  // Concurrency note: N/A - pure validation and UUID-backed record construction.
  protected build(input: CreateTagInput, id: string, now: string): TagRecord {
    const v = createTagSchema.parse(input);
    return {
      id,
      userId: v.userId,
      name: v.name,
      color: v.color ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
  }
  // Concurrency note: N/A - pure validation with no stored-state dependency.
  protected parseUpdate(input: UpdateTagInput) {
    return updateTagSchema.parse(input) as UpdateTagInput;
  }
  // Concurrency note: Safe read-only query; duplicate-name conflicts are surfaced separately and never resolved by timestamp.
  list(userId: string) {
    return (this.repository as TagRepositoryPort).listByUser(userId);
  }
}
