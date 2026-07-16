import type { NewUser } from "../../schema";

export type CreateUserInput = NewUser;
export type UpdateUserInput = Partial<Omit<NewUser, "id" | "createdAt">>;
