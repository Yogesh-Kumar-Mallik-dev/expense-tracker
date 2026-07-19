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
  timezone: z.string().default("UTC"),
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
  importFingerprint: nullableString.optional(),
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
export const periodSpendingSchema = z.object({
  currency: z.string().length(3),
  income: z.string(),
  expenses: z.string(),
  net: z.string(),
  transactionCount: z.number().int().nonnegative(),
});
export const categorySpendingSchema = z.object({
  categoryId: nullableString,
  currency: z.string().length(3),
  amount: z.string(),
  transactionCount: z.number().int().nonnegative(),
});
export const netWorthPointSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currency: z.string().length(3),
  balance: z.string(),
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
  deviceId: z.string().uuid().nullable().optional(),
});
export const sessionSchema = z.object({
  user: userSchema,
  tokens: tokenSetSchema,
});
export const backupSchema = z.object({
  format: z.literal("expense-tracker-backup"),
  schemaVersion: z.union([z.literal(1), z.literal(2)]),
  exportedAt: z.string().datetime(),
  user: userSchema.extend({
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  records: z.record(z.string(), z.array(z.unknown())),
  omissions: z.array(z.string()),
});
export const restoreDatasetSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  schemaVersion: z.number().int().positive().optional(),
  status: z.enum(["READY", "ACTIVATED", "DISCARDED"]),
  createdAt: z.string(),
});
export const scheduleOccurrenceSchema = z.object({
  id: z.string().uuid(),
  occurrenceDate: z.string(),
  status: z.enum(["DUE", "POSTED", "SKIPPED"]),
  transactionId: z.string().uuid().nullable(),
});
export const transactionScheduleSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  transferAccountId: z.string().uuid().nullable(),
  categoryId: z.string().uuid().nullable(),
  type: z.enum(["EXPENSE", "INCOME", "TRANSFER"]),
  amount: z.string(),
  currency: z.string().length(3),
  description: z.string().nullable(),
  note: z.string().nullable(),
  frequency: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]),
  interval: z.number().int().positive(),
  startsOn: z.string(),
  nextOccurrenceOn: z.string(),
  endsOn: z.string().nullable(),
  isActive: z.boolean(),
  occurrences: z.array(scheduleOccurrenceSchema).optional(),
});

export type Account = z.infer<typeof accountSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type Budget = z.infer<typeof budgetSchema>;
export type AccountBalance = z.infer<typeof balanceSchema>;
export type BudgetUsage = z.infer<typeof budgetUsageSchema>;
export type PeriodSpending = z.infer<typeof periodSpendingSchema>;
export type CategorySpending = z.infer<typeof categorySpendingSchema>;
export type NetWorthPoint = z.infer<typeof netWorthPointSchema>;
export type Tag = z.infer<typeof tagSchema>;
export type Device = z.infer<typeof deviceSchema>;
export type BudgetCategory = z.infer<typeof assignmentSchema>;
export type TransactionTag = z.infer<typeof transactionTagSchema>;
export type Attachment = z.infer<typeof attachmentSchema>;
export type EnvelopeAllocation = z.infer<typeof envelopeAllocationSchema>;
export type EnvelopeTransfer = z.infer<typeof envelopeTransferSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Backup = z.infer<typeof backupSchema>;
export type RestoreDataset = z.infer<typeof restoreDatasetSchema>;
export type TransactionSchedule = z.infer<typeof transactionScheduleSchema>;
export type User = z.infer<typeof userSchema>;
export type PageMeta = z.infer<typeof pageMetaSchema>;

export interface RegistrationInput {
  email: string;
  password: string;
  name: string | null;
  currency: string;
  deviceName?: string;
  devicePlatform?: "WEB" | "DESKTOP" | "IOS" | "ANDROID";
}
export interface TransactionFilters {
  page: number;
  pageSize: number;
  accountId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
  search?: string;
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
  importFingerprint?: string | null;
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
