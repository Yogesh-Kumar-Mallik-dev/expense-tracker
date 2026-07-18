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
  type: z.enum([
    "CASH",
    "CHECKING",
    "SAVINGS",
    "CREDIT_CARD",
    "WALLET",
    "OTHER",
  ]),
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
export const tagSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  color: nullableString,
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: nullableString,
});
export const deviceSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  platform: z.enum(["WEB", "DESKTOP", "IOS", "ANDROID"]),
  lastSeenAt: z.string(),
  createdAt: z.string(),
  deletedAt: nullableString,
});
export const assignmentSchema = z.object({
  id: z.string().uuid(),
  budgetId: z.string().uuid(),
  categoryId: z.string().uuid(),
  createdAt: z.string(),
  deletedAt: nullableString,
});
export const transactionTagSchema = z.object({
  id: z.string().uuid(),
  transactionId: z.string().uuid(),
  tagId: z.string().uuid(),
  createdAt: z.string(),
  deletedAt: nullableString,
});
export const attachmentSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  transactionId: z.string().uuid(),
  fileName: z.string(),
  storageKey: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  createdAt: z.string(),
  deletedAt: nullableString,
});
export const envelopeAllocationSchema = z.object({
  id: z.string().uuid(),
  budgetId: z.string().uuid(),
  categoryId: z.string().uuid(),
  amount: z.string(),
  occurredAt: z.string(),
  note: nullableString,
  createdAt: z.string(),
  deletedAt: nullableString,
});
export const envelopeTransferSchema = z.object({
  id: z.string().uuid(),
  budgetId: z.string().uuid(),
  fromCategoryId: nullableString,
  toCategoryId: nullableString,
  amount: z.string(),
  occurredAt: z.string(),
  note: nullableString,
  createdAt: z.string(),
  deletedAt: nullableString,
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
export type Tag = z.infer<typeof tagSchema>;
export type Device = z.infer<typeof deviceSchema>;
export type BudgetCategory = z.infer<typeof assignmentSchema>;
export type TransactionTag = z.infer<typeof transactionTagSchema>;
export type Attachment = z.infer<typeof attachmentSchema>;
export type EnvelopeAllocation = z.infer<typeof envelopeAllocationSchema>;
export type EnvelopeTransfer = z.infer<typeof envelopeTransferSchema>;
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
export interface AccountInput {
  name: string;
  type: Account["type"];
  currency: string;
  openingBalance: string;
}
export interface CategoryInput {
  name: string;
  type: Category["type"];
  parentId?: string | null;
}
export interface TagInput {
  name: string;
  color?: string | null;
}
export interface BudgetInput {
  name: string;
  amount: string;
  currency: string;
  startsOn: string;
  endsOn: string;
  mode: Budget["mode"];
  rolloverPolicy: Budget["rolloverPolicy"];
}
