import type { NewTag } from "../../schema";

export type CreateTagInput = NewTag;
export type UpdateTagInput = Partial<Omit<NewTag, "id" | "userId" | "createdAt">>;
