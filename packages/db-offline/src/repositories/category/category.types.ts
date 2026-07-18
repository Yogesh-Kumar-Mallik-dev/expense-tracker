import type { NewCategory } from "../../schema";

export type CreateCategoryInput = NewCategory;
export type UpdateCategoryInput = Partial<
  Omit<NewCategory, "id" | "userId" | "createdAt">
>;
