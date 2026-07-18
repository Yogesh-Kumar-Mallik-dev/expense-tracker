import { prisma, type PrismaClient } from "@expense-tracker/db-main";
import { z } from "zod";
import { HttpError } from "./http";
import {
  requireOwnedCategory,
  requireOwnedDevice,
  requireOwnedTag,
  validateAttachmentRelationship,
  validateTransactionRelationships,
} from "./domain-authorization";

const operationSchema = z.object({
  op: z.enum(["PUT", "PATCH", "DELETE"]),
  table: z.enum([
    "User",
    "Account",
    "Category",
    "Budget",
    "BudgetCategory",
    "EnvelopeAllocation",
    "BudgetTransfer",
    "Transaction",
    "Tag",
    "TransactionTag",
    "Attachment",
    "Device",
    "SyncState",
  ]),
  id: z.uuid(),
  data: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const uploadSchema = z
  .object({
    operations: z.array(operationSchema).min(1).max(1000),
  })
  .superRefine((input, context) => {
    input.operations.forEach((operation, operationIndex) => {
      for (const key of Object.keys(operation.data ?? {})) {
        if (!allowedFields[operation.table].has(key))
          context.addIssue({
            code: "custom",
            message: `${key} is not writable for ${operation.table}`,
            path: ["operations", operationIndex, "data", key],
          });
      }
      if (operation.op === "PUT") {
        for (const field of requiredPutFields[operation.table]) {
          if (!(field in (operation.data ?? {})))
            context.addIssue({
              code: "custom",
              message: `${field} is required when creating ${operation.table}`,
              path: ["operations", operationIndex, "data", field],
            });
        }
      }
    });
  });

type Operation = z.infer<typeof operationSchema>;
type Delegate = {
  findFirst(args: object): Promise<unknown>;
  create(args: object): Promise<unknown>;
  updateMany(args: object): Promise<{ count: number }>;
};
type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$use" | "$extends"
>;

const delegateNames = {
  User: "user",
  Account: "account",
  Category: "category",
  Budget: "budget",
  BudgetCategory: "budgetCategory",
  EnvelopeAllocation: "envelopeAllocation",
  BudgetTransfer: "budgetTransfer",
  Transaction: "transaction",
  Tag: "tag",
  TransactionTag: "transactionTag",
  Attachment: "attachment",
  Device: "device",
  SyncState: "syncState",
} as const;

const immutable = new Set(["id", "userId", "createdAt"]);
const serverOnly = new Set(["passwordHash"]);
const allowedFields: Record<Operation["table"], ReadonlySet<string>> = {
  User: new Set(["email", "name", "currency", "updatedAt", "deletedAt"]),
  Account: new Set([
    "userId",
    "name",
    "type",
    "currency",
    "openingBalance",
    "color",
    "icon",
    "isArchived",
    "createdAt",
    "updatedAt",
    "deletedAt",
  ]),
  Category: new Set([
    "userId",
    "parentId",
    "name",
    "type",
    "color",
    "icon",
    "isArchived",
    "createdAt",
    "updatedAt",
    "deletedAt",
  ]),
  Budget: new Set([
    "userId",
    "name",
    "amount",
    "currency",
    "startsOn",
    "endsOn",
    "mode",
    "rolloverPolicy",
    "createdAt",
    "updatedAt",
    "deletedAt",
  ]),
  BudgetCategory: new Set(["budgetId", "categoryId", "createdAt", "deletedAt"]),
  EnvelopeAllocation: new Set([
    "budgetId",
    "categoryId",
    "amount",
    "occurredAt",
    "note",
    "createdAt",
    "deletedAt",
  ]),
  BudgetTransfer: new Set([
    "budgetId",
    "fromCategoryId",
    "toCategoryId",
    "amount",
    "occurredAt",
    "note",
    "createdAt",
    "deletedAt",
  ]),
  Transaction: new Set([
    "userId",
    "accountId",
    "transferAccountId",
    "categoryId",
    "type",
    "amount",
    "currency",
    "description",
    "note",
    "importFingerprint",
    "occurredAt",
    "createdAt",
    "updatedAt",
    "deletedAt",
  ]),
  Tag: new Set([
    "userId",
    "name",
    "color",
    "createdAt",
    "updatedAt",
    "deletedAt",
  ]),
  TransactionTag: new Set(["transactionId", "tagId", "createdAt", "deletedAt"]),
  Attachment: new Set([
    "userId",
    "transactionId",
    "fileName",
    "storageKey",
    "mimeType",
    "sizeBytes",
    "createdAt",
    "deletedAt",
  ]),
  Device: new Set([
    "userId",
    "name",
    "platform",
    "lastSeenAt",
    "createdAt",
    "deletedAt",
  ]),
  SyncState: new Set([
    "userId",
    "deviceId",
    "lastSyncedAt",
    "checkpoint",
    "createdAt",
    "updatedAt",
    "deletedAt",
  ]),
};
const requiredPutFields: Record<Operation["table"], readonly string[]> = {
  User: [],
  Account: [
    "userId",
    "name",
    "type",
    "currency",
    "openingBalance",
    "isArchived",
    "createdAt",
    "updatedAt",
  ],
  Category: ["userId", "name", "type", "isArchived", "createdAt", "updatedAt"],
  Budget: [
    "userId",
    "name",
    "amount",
    "currency",
    "startsOn",
    "endsOn",
    "mode",
    "rolloverPolicy",
    "createdAt",
    "updatedAt",
  ],
  BudgetCategory: ["budgetId", "categoryId", "createdAt"],
  EnvelopeAllocation: [
    "budgetId",
    "categoryId",
    "amount",
    "occurredAt",
    "createdAt",
  ],
  BudgetTransfer: ["budgetId", "amount", "occurredAt", "createdAt"],
  Transaction: [
    "userId",
    "accountId",
    "transferAccountId",
    "categoryId",
    "type",
    "amount",
    "currency",
    "occurredAt",
    "createdAt",
    "updatedAt",
  ],
  Tag: ["userId", "name", "createdAt", "updatedAt"],
  TransactionTag: ["transactionId", "tagId", "createdAt"],
  Attachment: [
    "userId",
    "transactionId",
    "fileName",
    "storageKey",
    "mimeType",
    "sizeBytes",
    "createdAt",
  ],
  Device: ["userId", "name", "platform", "lastSeenAt", "createdAt"],
  SyncState: ["userId", "deviceId", "createdAt", "updatedAt"],
};
const dateFields = new Set([
  "createdAt",
  "updatedAt",
  "deletedAt",
  "occurredAt",
  "startsOn",
  "endsOn",
  "lastSeenAt",
  "lastSyncedAt",
]);

function cleanData(operation: Operation, userId: string) {
  const source = operation.data ?? {};
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (!allowedFields[operation.table].has(key))
      throw new HttpError(
        400,
        "INVALID_SYNC_FIELD",
        `${key} is not writable for ${operation.table}`,
        [key],
      );
    if (serverOnly.has(key) || key === "id") continue;
    if (dateFields.has(key) && typeof value === "string")
      result[key] = new Date(value);
    else result[key] = value;
  }
  if ("userId" in source && source.userId !== userId) {
    throw new HttpError(
      403,
      "SYNC_OWNERSHIP_VIOLATION",
      "An operation targets another user",
    );
  }
  if (
    ["Transaction", "EnvelopeAllocation", "BudgetTransfer"].includes(
      operation.table,
    ) &&
    "amount" in source &&
    (typeof source.amount !== "string" ||
      !/^\d+(?:\.\d{1,4})?$/.test(source.amount) ||
      !/[1-9]/.test(source.amount))
  )
    throw new HttpError(
      400,
      "INVALID_SYNC_OPERATION",
      "Amount must be a positive decimal with at most four fractional digits",
      ["amount"],
    );
  if (
    operation.table === "Transaction" &&
    "importFingerprint" in source &&
    source.importFingerprint !== null &&
    (typeof source.importFingerprint !== "string" ||
      !/^[a-f0-9]{64}$/.test(source.importFingerprint))
  )
    throw new HttpError(
      400,
      "INVALID_SYNC_OPERATION",
      "Import fingerprint must be a SHA-256 hexadecimal string",
      ["importFingerprint"],
    );
  return result;
}

function delegate(
  db: PrismaClient | TransactionClient,
  table: Operation["table"],
): Delegate {
  const key = delegateNames[table];
  return (db as unknown as Record<string, Delegate>)[key]!;
}

async function assertOwned(
  db: PrismaClient | TransactionClient,
  operation: Operation,
  userId: string,
) {
  if (operation.table === "BudgetCategory") {
    const existing =
      operation.op === "PUT"
        ? null
        : await db.budgetCategory.findFirst({
            where: { id: operation.id },
            select: { budgetId: true, categoryId: true },
          });
    const budgetId = operation.data?.budgetId ?? existing?.budgetId;
    if (typeof budgetId !== "string")
      throw new HttpError(
        400,
        "INVALID_SYNC_OPERATION",
        "budgetId is required",
      );
    const budget = await db.budget.findFirst({
      where: { id: budgetId, userId, deletedAt: null },
    });
    if (!budget)
      throw new HttpError(
        403,
        "SYNC_OWNERSHIP_VIOLATION",
        "Budget is not owned by this user",
      );
    const categoryId = operation.data?.categoryId ?? existing?.categoryId;
    if (typeof categoryId === "string")
      await requireOwnedCategory(userId, categoryId, db);
    return;
  }
  if (
    operation.table === "EnvelopeAllocation" ||
    operation.table === "BudgetTransfer"
  ) {
    const existing =
      operation.op === "PUT"
        ? null
        : await delegate(db, operation.table).findFirst({
            where: { id: operation.id },
          });
    const record = existing as Record<string, unknown> | null;
    const budgetId = operation.data?.budgetId ?? record?.budgetId;
    if (typeof budgetId !== "string")
      throw new HttpError(
        400,
        "INVALID_SYNC_OPERATION",
        "budgetId is required",
      );
    const budget = await db.budget.findFirst({
      where: { id: budgetId, userId, deletedAt: null, mode: "ENVELOPE" },
    });
    if (!budget)
      throw new HttpError(
        403,
        "SYNC_OWNERSHIP_VIOLATION",
        "Envelope budget is not owned by this user",
      );
    const categoryIds =
      operation.table === "EnvelopeAllocation"
        ? [operation.data?.categoryId]
        : [operation.data?.fromCategoryId, operation.data?.toCategoryId];
    for (const categoryId of categoryIds)
      if (typeof categoryId === "string") {
        await requireOwnedCategory(userId, categoryId, db);
        const assignment = await db.budgetCategory.findFirst({
          where: { budgetId, categoryId, deletedAt: null },
        });
        if (!assignment)
          throw new HttpError(
            400,
            "INVALID_DOMAIN_RELATIONSHIP",
            "Envelope category must be assigned to the budget",
            ["categoryId"],
          );
      }
    return;
  }
  if (operation.table === "TransactionTag") {
    const existing =
      operation.op === "PUT"
        ? null
        : await db.transactionTag.findFirst({
            where: { id: operation.id },
            select: { transactionId: true },
          });
    const transactionId =
      operation.data?.transactionId ?? existing?.transactionId;
    if (typeof transactionId !== "string")
      throw new HttpError(
        400,
        "INVALID_SYNC_OPERATION",
        "transactionId is required",
      );
    const transaction = await db.transaction.findFirst({
      where: { id: transactionId, userId, deletedAt: null },
    });
    if (!transaction)
      throw new HttpError(
        403,
        "SYNC_OWNERSHIP_VIOLATION",
        "Transaction is not owned by this user",
      );
    const existingTag =
      operation.op === "PUT"
        ? null
        : await db.transactionTag.findFirst({
            where: { id: operation.id },
            select: { tagId: true },
          });
    const tagId = operation.data?.tagId ?? existingTag?.tagId;
    if (typeof tagId === "string") await requireOwnedTag(userId, tagId, db);
    return;
  }
  if (operation.table === "User") {
    if (operation.id !== userId)
      throw new HttpError(
        403,
        "SYNC_OWNERSHIP_VIOLATION",
        "User profile does not match token",
      );
    if (operation.op === "PUT") {
      throw new HttpError(
        400,
        "INVALID_SYNC_OPERATION",
        "Users must be created through registration",
      );
    }
    return;
  }
  const dataUserId = operation.data?.userId;
  if (operation.op === "PUT" && dataUserId !== userId) {
    throw new HttpError(
      403,
      "SYNC_OWNERSHIP_VIOLATION",
      "New rows must belong to the authenticated user",
    );
  }
  if (operation.op === "PUT") {
    const existing = await delegate(db, operation.table).findFirst({
      where: { id: operation.id },
    });
    if (existing) {
      const owned = await delegate(db, operation.table).findFirst({
        where: { id: operation.id, userId },
      });
      if (!owned)
        throw new HttpError(
          403,
          "SYNC_OWNERSHIP_VIOLATION",
          "Existing record is not owned by this user",
        );
    }
  }
  if (operation.op !== "PUT") {
    const existing = await delegate(db, operation.table).findFirst({
      where: { id: operation.id, userId },
    });
    if (!existing)
      throw new HttpError(
        403,
        "SYNC_OWNERSHIP_VIOLATION",
        "Record is not owned by this user",
      );
  }
  if (operation.table === "Transaction" && operation.data) {
    const current =
      operation.op === "PUT"
        ? {}
        : ((await db.transaction.findFirst({
            where: { id: operation.id, userId },
          })) ?? {});
    const value = { ...current, ...operation.data } as Record<string, unknown>;
    await validateTransactionRelationships(
      userId,
      value as Parameters<typeof validateTransactionRelationships>[1],
      db,
    );
  }
  if (
    operation.table === "Category" &&
    typeof operation.data?.parentId === "string"
  )
    await requireOwnedCategory(userId, operation.data.parentId, db);
  if (
    operation.table === "Attachment" &&
    typeof operation.data?.transactionId === "string" &&
    typeof operation.data.storageKey === "string"
  )
    await validateAttachmentRelationship(
      userId,
      operation.data.transactionId,
      operation.data.storageKey,
      db,
    );
  if (
    operation.table === "SyncState" &&
    typeof operation.data?.deviceId === "string"
  )
    await requireOwnedDevice(userId, operation.data.deviceId, db);
}

async function applyOperation(
  db: PrismaClient | TransactionClient,
  operation: Operation,
  userId: string,
) {
  await assertOwned(db, operation, userId);
  const model = delegate(db, operation.table);
  if (operation.op === "DELETE") {
    await model.updateMany({
      where: { id: operation.id },
      data: { deletedAt: new Date() },
    });
    return;
  }
  const data = cleanData(operation, userId);
  if (operation.op === "PUT") {
    const existing = await model.findFirst({ where: { id: operation.id } });
    if (existing) {
      const record = existing as Record<string, unknown>;
      const compatible = Object.entries(data).every(([key, value]) => {
        const stored = record[key];
        if (stored instanceof Date && value instanceof Date)
          return stored.getTime() === value.getTime();
        return String(stored ?? "") === String(value ?? "");
      });
      if (compatible) return;
      throw new HttpError(
        409,
        "PERMANENT_SYNC_CONFLICT",
        "The synchronized ID already exists with incompatible data",
        [],
        {
          conflict: {
            entity: operation.table,
            recordId: operation.id,
            kind: "ID_COLLISION",
            fields: [],
            recovery: "RECREATE_WITH_NEW_ID",
          },
        },
      );
    }
    await model.create({
      data: {
        id: operation.id,
        ...data,
        ...(operation.table === "User"
          ? {}
          : operation.table === "BudgetCategory" ||
              operation.table === "TransactionTag"
            ? {}
            : { userId }),
      },
    });
    return;
  }
  for (const key of immutable) delete data[key];
  await model.updateMany({ where: { id: operation.id }, data });
}

export async function applyUpload(
  input: z.infer<typeof uploadSchema>,
  userId: string,
) {
  await prisma.$transaction(async (db) => {
    for (const [operationIndex, operation] of input.operations.entries()) {
      try {
        await applyOperation(db, operation, userId);
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          (error.code === "P2002" || error.code === "P2003")
        ) {
          throw new HttpError(
            409,
            "PERMANENT_SYNC_CONFLICT",
            error.code === "P2002"
              ? "A synchronized value conflicts with an existing record"
              : "A synchronized record is missing a required parent",
            [],
            {
              conflict: {
                operationIndex,
                entity: operation.table,
                recordId: operation.id,
                kind:
                  error.code === "P2002"
                    ? "UNIQUE_CONSTRAINT"
                    : "MISSING_PARENT",
                fields: [],
                recovery:
                  error.code === "P2002"
                    ? "RENAME_OR_MERGE"
                    : "RECREATE_PARENT",
              },
            },
          );
        }
        throw error;
      }
    }
  });
}
