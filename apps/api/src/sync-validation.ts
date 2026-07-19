import {
  budgetCategorySchema,
  createAccountSchema,
  createBudgetSchema,
  createCategorySchema,
  createDeviceSchema,
  createTagSchema,
  createTransactionSchema,
  envelopeAllocationSchema,
  envelopeTransferSchema,
  syncStateSchema,
  syncUserProfileSchema,
  transactionTagSchema,
} from "@expense-tracker/services";
import { z } from "zod";

export type SynchronizedTable =
  | "User"
  | "Account"
  | "Category"
  | "Budget"
  | "BudgetCategory"
  | "EnvelopeAllocation"
  | "BudgetTransfer"
  | "Transaction"
  | "Tag"
  | "TransactionTag"
  | "Attachment"
  | "Device"
  | "SyncState";

const accountSchema = createAccountSchema.extend({
  isArchived: z.boolean(),
});
const categorySchema = createCategorySchema.extend({
  isArchived: z.boolean(),
});
const deviceSchema = createDeviceSchema.extend({
  lastSeenAt: z.iso.datetime(),
});
const dateTimeSchema = z.iso.datetime();
const nullableDateTimeSchema = dateTimeSchema.nullable();

function normalizeScalar(
  table: SynchronizedTable,
  key: string,
  value: unknown,
) {
  if (value instanceof Date) {
    const iso = value.toISOString();
    if (
      (table === "Budget" && (key === "startsOn" || key === "endsOn")) ||
      ((table === "EnvelopeAllocation" || table === "BudgetTransfer") &&
        key === "occurredAt")
    )
      return iso.slice(0, 10);
    return iso;
  }
  if (
    value &&
    typeof value === "object" &&
    "toString" in value &&
    typeof value.toString === "function"
  )
    return value.toString();
  return value;
}

export function normalizeSynchronizedRecord(
  table: SynchronizedTable,
  value: Record<string, unknown>,
) {
  return Object.fromEntries(
    Object.entries(value).map(([key, field]) => [
      key,
      normalizeScalar(table, key, field),
    ]),
  );
}

export function validateSynchronizedRecord(
  table: SynchronizedTable,
  value: Record<string, unknown>,
): Record<string, unknown> {
  const normalized = normalizeSynchronizedRecord(table, value);
  switch (table) {
    case "User":
      return syncUserProfileSchema.parse(normalized);
    case "Account":
      return accountSchema.parse(normalized);
    case "Category":
      return categorySchema.parse(normalized);
    case "Budget":
      return createBudgetSchema.parse(normalized);
    case "BudgetCategory":
      return budgetCategorySchema.parse(normalized);
    case "EnvelopeAllocation":
      return envelopeAllocationSchema.parse(normalized);
    case "BudgetTransfer":
      return envelopeTransferSchema.parse(normalized);
    case "Transaction":
      return createTransactionSchema.parse(normalized);
    case "Tag":
      return createTagSchema.parse(normalized);
    case "TransactionTag":
      return transactionTagSchema.parse(normalized);
    case "Device":
      return deviceSchema.parse(normalized);
    case "SyncState":
      return syncStateSchema.parse(normalized);
    case "Attachment":
      throw new Error("Attachments are not writable through synchronization");
  }
}

export function mergeAndValidateSynchronizedRecord(
  table: SynchronizedTable,
  existing: Record<string, unknown> | null,
  patch: Record<string, unknown>,
) {
  return validateSynchronizedRecord(table, {
    ...(existing ? normalizeSynchronizedRecord(table, existing) : {}),
    ...patch,
  });
}

export function validateSynchronizedMetadata(
  key: string,
  value: unknown,
): unknown {
  if (key === "deletedAt") return nullableDateTimeSchema.parse(value);
  if (
    key === "createdAt" ||
    key === "updatedAt" ||
    key === "lastSeenAt" ||
    key === "lastSyncedAt"
  )
    return key === "lastSyncedAt"
      ? nullableDateTimeSchema.parse(value)
      : dateTimeSchema.parse(value);
  return value;
}
