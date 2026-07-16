import { z } from "zod";
import { SingleRowService, type CrudRepositoryPort } from "../shared";

export type CategoryType = "EXPENSE" | "INCOME";
export interface CategoryRecord {
  id: string;
  userId: string;
  parentId: string | null;
  name: string;
  type: CategoryType;
  color: string | null;
  icon: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
export interface CreateCategoryInput {
  userId: string;
  parentId?: string | null;
  name: string;
  type?: CategoryType;
  color?: string | null;
  icon?: string | null;
}
export type UpdateCategoryInput = Partial<
  Pick<
    CategoryRecord,
    "parentId" | "name" | "type" | "color" | "icon" | "isArchived"
  >
>;
export interface CategoryRepositoryPort extends CrudRepositoryPort<
  CategoryRecord,
  UpdateCategoryInput
> {
  listByUser(
    userId: string,
    type?: CategoryType,
    includeArchived?: boolean,
  ): Promise<CategoryRecord[]>;
}
const createSchema = z.object({
  userId: z.uuid(),
  parentId: z.uuid().nullable().optional(),
  name: z.string().trim().min(1).max(120),
  type: z.enum(["EXPENSE", "INCOME"]).default("EXPENSE"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable()
    .optional(),
  icon: z.string().trim().min(1).max(100).nullable().optional(),
});
const updateSchema = createSchema
  .omit({ userId: true })
  .partial()
  .extend({ isArchived: z.boolean().optional() })
  .refine((v) => Object.keys(v).length > 0);
export class CategoryService extends SingleRowService<
  CategoryRecord,
  CreateCategoryInput,
  UpdateCategoryInput
> {
  constructor(repository: CategoryRepositoryPort) {
    super(repository);
  }
  // Concurrency note: N/A - pure validation and record construction with no database read.
  protected build(
    input: CreateCategoryInput,
    id: string,
    now: string,
  ): CategoryRecord {
    const v = createSchema.parse(input);
    return {
      id,
      userId: v.userId,
      parentId: v.parentId ?? null,
      name: v.name,
      type: v.type,
      color: v.color ?? null,
      icon: v.icon ?? null,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
  }
  // Concurrency note: N/A - pure validation; undefined fields are omitted by callers and never read from storage.
  protected parseUpdate(input: UpdateCategoryInput) {
    return updateSchema.parse(input) as UpdateCategoryInput;
  }
  // Concurrency note: Safe read-only query; archive/type filters do not participate in conflict resolution.
  list(userId: string, type?: CategoryType, includeArchived = false) {
    return (this.repository as CategoryRepositoryPort).listByUser(
      userId,
      type,
      includeArchived,
    );
  }
}
