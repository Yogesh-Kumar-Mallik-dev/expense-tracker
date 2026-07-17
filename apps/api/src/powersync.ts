import { prisma, type PrismaClient } from "@expense-tracker/db-main";
import { z } from "zod";
import { HttpError } from "./http";

const operationSchema = z.object({
  op: z.enum(["PUT", "PATCH", "DELETE"]),
  table: z.enum([
    "User",
    "Account",
    "Category",
    "Budget",
    "BudgetCategory",
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

export const uploadSchema = z.object({
  operations: z.array(operationSchema).min(1).max(1000),
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
  Transaction: "transaction",
  Tag: "tag",
  TransactionTag: "transactionTag",
  Attachment: "attachment",
  Device: "device",
  SyncState: "syncState",
} as const;

const immutable = new Set(["id", "userId", "createdAt"]);
const serverOnly = new Set(["passwordHash"]);
const dateFields = new Set([
  "createdAt", "updatedAt", "deletedAt", "occurredAt", "startsOn", "endsOn",
  "lastSeenAt", "lastSyncedAt",
]);

function cleanData(operation: Operation, userId: string) {
  const source = operation.data ?? {};
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (serverOnly.has(key) || key === "id") continue;
    if (dateFields.has(key) && typeof value === "string") result[key] = new Date(value);
    else result[key] = value;
  }
  if ("userId" in source && source.userId !== userId) {
    throw new HttpError(403, "SYNC_OWNERSHIP_VIOLATION", "An operation targets another user");
  }
  return result;
}

function delegate(db: PrismaClient | TransactionClient, table: Operation["table"]): Delegate {
  const key = delegateNames[table];
  return (db as unknown as Record<string, Delegate>)[key]!;
}

async function assertOwned(
  db: PrismaClient | TransactionClient,
  operation: Operation,
  userId: string,
) {
  if (operation.table === "BudgetCategory") {
    const existing = operation.op === "PUT"
      ? null
      : await db.budgetCategory.findFirst({
          where: { id: operation.id },
          select: { budgetId: true },
        });
    const budgetId = operation.data?.budgetId ?? existing?.budgetId;
    if (typeof budgetId !== "string") throw new HttpError(400, "INVALID_SYNC_OPERATION", "budgetId is required");
    const budget = await db.budget.findFirst({ where: { id: budgetId, userId, deletedAt: null } });
    if (!budget) throw new HttpError(403, "SYNC_OWNERSHIP_VIOLATION", "Budget is not owned by this user");
    return;
  }
  if (operation.table === "TransactionTag") {
    const existing = operation.op === "PUT"
      ? null
      : await db.transactionTag.findFirst({
          where: { id: operation.id },
          select: { transactionId: true },
        });
    const transactionId = operation.data?.transactionId ?? existing?.transactionId;
    if (typeof transactionId !== "string") throw new HttpError(400, "INVALID_SYNC_OPERATION", "transactionId is required");
    const transaction = await db.transaction.findFirst({ where: { id: transactionId, userId, deletedAt: null } });
    if (!transaction) throw new HttpError(403, "SYNC_OWNERSHIP_VIOLATION", "Transaction is not owned by this user");
    return;
  }
  if (operation.table === "User") {
    if (operation.id !== userId) throw new HttpError(403, "SYNC_OWNERSHIP_VIOLATION", "User profile does not match token");
    if (operation.op === "PUT") {
      throw new HttpError(400, "INVALID_SYNC_OPERATION", "Users must be created through registration");
    }
    return;
  }
  const dataUserId = operation.data?.userId;
  if (operation.op === "PUT" && dataUserId !== userId) {
    throw new HttpError(403, "SYNC_OWNERSHIP_VIOLATION", "New rows must belong to the authenticated user");
  }
  if (operation.op !== "PUT") {
    const existing = await delegate(db, operation.table).findFirst({
      where: { id: operation.id, userId },
    });
    if (!existing) throw new HttpError(403, "SYNC_OWNERSHIP_VIOLATION", "Record is not owned by this user");
  }
}

async function applyOperation(
  db: PrismaClient | TransactionClient,
  operation: Operation,
  userId: string,
) {
  await assertOwned(db, operation, userId);
  const model = delegate(db, operation.table);
  if (operation.op === "DELETE") {
    await model.updateMany({ where: { id: operation.id }, data: { deletedAt: new Date() } });
    return;
  }
  const data = cleanData(operation, userId);
  if (operation.op === "PUT") {
    await model.create({
      data: {
        id: operation.id,
        ...data,
        ...(operation.table === "User" ? {} : operation.table === "BudgetCategory" || operation.table === "TransactionTag" ? {} : { userId }),
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
    for (const operation of input.operations) {
      await applyOperation(db, operation, userId);
    }
  });
}
