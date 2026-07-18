import { prisma, type PrismaClient } from "@expense-tracker/db-main";
import { HttpError } from "./http";

type Db = Pick<
  PrismaClient,
  | "account"
  | "category"
  | "transaction"
  | "budget"
  | "budgetCategory"
  | "tag"
  | "device"
>;

type TransactionValues = {
  accountId: string;
  transferAccountId: string | null;
  categoryId: string | null;
  type: "EXPENSE" | "INCOME" | "TRANSFER";
  currency: string;
};

function forbidden(message: string, fields: string[]): never {
  throw new HttpError(403, "RELATED_RECORD_NOT_OWNED", message, fields);
}

function invalid(message: string, fields: string[]): never {
  throw new HttpError(400, "INVALID_DOMAIN_RELATIONSHIP", message, fields);
}

export async function validateTransactionRelationships(
  userId: string,
  values: TransactionValues,
  db: Db = prisma,
) {
  const [source, destination, category] = await Promise.all([
    db.account.findFirst({
      where: { id: values.accountId, userId, deletedAt: null },
      select: { id: true, currency: true, isArchived: true },
    }),
    values.transferAccountId
      ? db.account.findFirst({
          where: {
            id: values.transferAccountId,
            userId,
            deletedAt: null,
          },
          select: { id: true, currency: true, isArchived: true },
        })
      : null,
    values.categoryId
      ? db.category.findFirst({
          where: { id: values.categoryId, userId, deletedAt: null },
          select: { id: true, type: true, isArchived: true },
        })
      : null,
  ]);
  if (!source)
    forbidden("Source account is not owned by this user", ["accountId"]);
  if (source.isArchived)
    invalid("Archived accounts cannot receive new transactions", ["accountId"]);
  if (values.currency !== source.currency)
    invalid("Transaction currency must match the source account", ["currency"]);
  if (values.transferAccountId && !destination)
    forbidden("Destination account is not owned by this user", [
      "transferAccountId",
    ]);
  if (destination?.isArchived)
    invalid("Archived accounts cannot receive transfers", [
      "transferAccountId",
    ]);
  if (destination && destination.currency !== source.currency)
    invalid("Transfer accounts must use the same currency", [
      "transferAccountId",
    ]);
  if (values.categoryId && !category)
    forbidden("Category is not owned by this user", ["categoryId"]);
  if (category?.isArchived)
    invalid("Archived categories cannot receive new transactions", [
      "categoryId",
    ]);
  if (
    category &&
    ((values.type === "EXPENSE" && category.type !== "EXPENSE") ||
      (values.type === "INCOME" && category.type !== "INCOME"))
  )
    invalid("Category type must match the transaction type", ["categoryId"]);
  if (values.type === "TRANSFER" && category)
    invalid("Transfers cannot have a category", ["categoryId"]);
}

export async function validateAttachmentRelationship(
  userId: string,
  transactionId: string,
  storageKey: string,
  db: Db = prisma,
) {
  const transaction = await db.transaction.findFirst({
    where: { id: transactionId, userId, deletedAt: null },
    select: { id: true },
  });
  if (!transaction)
    forbidden("Attachment transaction is not owned by this user", [
      "transactionId",
    ]);
  if (!storageKey.startsWith(`users/${userId}/transactions/${transactionId}/`))
    invalid("Attachment storage key is outside the user transaction prefix", [
      "storageKey",
    ]);
}

export async function requireOwnedCategory(
  userId: string,
  categoryId: string,
  db: Db = prisma,
) {
  const category = await db.category.findFirst({
    where: { id: categoryId, userId, deletedAt: null },
    select: { id: true },
  });
  if (!category)
    forbidden("Category is not owned by this user", ["categoryId"]);
}

export async function requireOwnedTag(
  userId: string,
  tagId: string,
  db: Db = prisma,
) {
  const tag = await db.tag.findFirst({
    where: { id: tagId, userId, deletedAt: null },
    select: { id: true },
  });
  if (!tag) forbidden("Tag is not owned by this user", ["tagId"]);
}

export async function requireOwnedDevice(
  userId: string,
  deviceId: string,
  db: Db = prisma,
) {
  const device = await db.device.findFirst({
    where: { id: deviceId, userId, deletedAt: null },
    select: { id: true },
  });
  if (!device) forbidden("Device is not owned by this user", ["deviceId"]);
}
