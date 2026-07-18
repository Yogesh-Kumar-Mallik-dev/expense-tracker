import type { NewAccount } from "../../schema";

export type CreateAccountInput = NewAccount;
export type UpdateAccountInput = Partial<
  Omit<NewAccount, "id" | "userId" | "createdAt">
>;
