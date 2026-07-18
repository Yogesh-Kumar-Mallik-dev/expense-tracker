import { z } from "zod";

export const moneySchema = z.string().regex(/^\d+(?:\.\d{1,4})?$/);
const nullableString = z.string().nullable();
export const pageMetaSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNext: z.boolean(),
  hasPrevious: z.boolean(),
});
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: nullableString,
  currency: z.string().length(3),
});
export const accountSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  type: z.enum(["CASH", "CHECKING", "SAVINGS", "CREDIT_CARD", "WALLET", "OTHER"]),
  currency: z.string().length(3),
  openingBalance: moneySchema,
  color: nullableString,
  icon: nullableString,
  isArchived: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: nullableString,
});
export const categorySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  parentId: nullableString,
  name: z.string(),
  type: z.enum(["EXPENSE", "INCOME"]),
  color: nullableString,
  icon: nullableString,
  isArchived: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: nullableString,
});
export const transactionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  accountId: z.string().uuid(),
  transferAccountId: nullableString,
  categoryId: nullableString,
  type: z.enum(["EXPENSE", "INCOME", "TRANSFER"]),
  amount: moneySchema,
  currency: z.string().length(3),
  description: nullableString,
  note: nullableString,
  occurredAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: nullableString,
});
export const budgetSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  amount: moneySchema,
  currency: z.string().length(3),
  startsOn: z.string(),
  endsOn: z.string(),
  mode: z.enum(["SPENDING_LIMIT", "ENVELOPE"]),
  rolloverPolicy: z.enum(["NONE", "POSITIVE_ONLY", "FULL"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: nullableString,
});
export const balanceSchema = z.object({
  accountId: z.string().uuid(),
  currency: z.string().length(3),
  balance: z.string(),
  excludedTransactionIds: z.array(z.string().uuid()),
});
export const budgetUsageSchema = z.object({
  budgetId: z.string().uuid(),
  mode: z.enum(["SPENDING_LIMIT", "ENVELOPE"]),
  currency: z.string().length(3),
  spent: z.string(),
  remaining: z.string(),
  assigned: z.string(),
  available: z.string(),
  excludedTransactionIds: z.array(z.string().uuid()),
});
export const tokenSetSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
  expiresIn: z.number().positive(),
});
export const sessionSchema = z.object({
  user: userSchema,
  tokens: tokenSetSchema,
});

export type Account = z.infer<typeof accountSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type Budget = z.infer<typeof budgetSchema>;
export type AccountBalance = z.infer<typeof balanceSchema>;
export type BudgetUsage = z.infer<typeof budgetUsageSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type User = z.infer<typeof userSchema>;
export type PageMeta = z.infer<typeof pageMetaSchema>;

export interface RegistrationInput {
  email: string;
  password: string;
  name: string | null;
  currency: string;
}
export interface TransactionFilters {
  page: number;
  pageSize: number;
  accountId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
}
export interface TransactionInput {
  accountId: string;
  transferAccountId: string | null;
  categoryId: string | null;
  type: "EXPENSE" | "INCOME" | "TRANSFER";
  amount: string;
  currency: string;
  description: string | null;
  note: string | null;
  occurredAt: string;
}
