import assert from "node:assert/strict";
import test from "node:test";
import {
  mergeAndValidateSynchronizedRecord,
  validateSynchronizedMetadata,
  validateSynchronizedRecord,
} from "../../apps/api/src/sync-validation";
import { validateCategoryParentRelationship } from "../../apps/api/src/domain-authorization";

const userId = "00000000-0000-4000-8000-000000000001";
const accountId = "00000000-0000-4000-8000-000000000002";
const secondId = "00000000-0000-4000-8000-000000000003";
const isValidationError = (error: unknown) =>
  error instanceof Error && error.name === "ZodError";

test("synchronization reuses service validation for domain records", () => {
  const invalidRecords = [
    [
      "Account",
      {
        userId,
        name: " ",
        type: "CASH",
        currency: "RUPEES",
        openingBalance: "0",
        color: "red",
        isArchived: false,
      },
    ],
    [
      "Category",
      {
        userId,
        parentId: "not-a-uuid",
        name: "Food",
        type: "EXPENSE",
        icon: "x".repeat(101),
        isArchived: false,
      },
    ],
    [
      "Budget",
      {
        userId,
        name: "Food",
        amount: "100",
        currency: "INR",
        startsOn: "2026-08-01",
        endsOn: "2026-07-01",
        mode: "SPENDING_LIMIT",
        rolloverPolicy: "NONE",
      },
    ],
    [
      "EnvelopeAllocation",
      {
        budgetId: accountId,
        categoryId: secondId,
        amount: "0",
        occurredAt: "2026-07-19",
        note: null,
      },
    ],
    [
      "BudgetTransfer",
      {
        budgetId: accountId,
        fromCategoryId: secondId,
        toCategoryId: secondId,
        amount: "1",
        occurredAt: "2026-07-19",
        note: null,
      },
    ],
    [
      "Transaction",
      {
        userId,
        accountId,
        transferAccountId: accountId,
        categoryId: null,
        type: "TRANSFER",
        amount: "1",
        currency: "INR",
        description: null,
        note: "x".repeat(2001),
        importFingerprint: null,
        occurredAt: "not-a-date",
      },
    ],
    ["Tag", { userId, name: "", color: null }],
    ["BudgetCategory", { budgetId: "bad", categoryId: secondId }],
    [
      "Device",
      {
        userId,
        name: "",
        platform: "WATCH",
        lastSeenAt: "not-a-date",
      },
    ],
    [
      "SyncState",
      {
        userId,
        deviceId: secondId,
        lastSyncedAt: null,
        checkpoint: "x".repeat(10_001),
      },
    ],
  ] as const;

  for (const [table, value] of invalidRecords)
    assert.throws(
      () => validateSynchronizedRecord(table, value),
      isValidationError,
      `${table} should use its domain contract`,
    );
});

test("PATCH validation parses the complete authoritative result", () => {
  const existing = {
    userId,
    accountId,
    transferAccountId: null,
    categoryId: secondId,
    type: "EXPENSE",
    amount: "12.5000",
    currency: "inr",
    description: " Groceries ",
    note: null,
    importFingerprint: null,
    occurredAt: new Date("2026-07-19T06:30:00.000Z"),
  };

  assert.throws(
    () =>
      mergeAndValidateSynchronizedRecord("Transaction", existing, {
        type: "TRANSFER",
      }),
    isValidationError,
  );

  const validated = mergeAndValidateSynchronizedRecord(
    "Transaction",
    existing,
    { amount: "14.2500" },
  );
  assert.equal(validated.amount, "14.2500");
  assert.equal(validated.currency, "INR");
  assert.equal(validated.description, "Groceries");
});

test("synchronization metadata rejects invalid client timestamps", () => {
  assert.throws(
    () => validateSynchronizedMetadata("updatedAt", "not-a-date"),
    isValidationError,
  );
  assert.equal(
    validateSynchronizedMetadata("updatedAt", "2026-07-19T00:00:00.000Z"),
    "2026-07-19T00:00:00.000Z",
  );
});

test("category synchronization rejects self, descendant, and mixed-type parents", async () => {
  const categoryId = "00000000-0000-4000-8000-000000000004";
  const parentId = "00000000-0000-4000-8000-000000000005";
  const descendantId = "00000000-0000-4000-8000-000000000006";
  const rows = new Map([
    [
      parentId,
      { id: parentId, parentId: descendantId, type: "EXPENSE" as const },
    ],
    [
      descendantId,
      { id: descendantId, parentId: categoryId, type: "EXPENSE" as const },
    ],
  ]);
  const db = {
    category: {
      findFirst: async ({ where }: { where: { id: string } }) =>
        rows.get(where.id) ?? null,
    },
  } as unknown as Parameters<typeof validateCategoryParentRelationship>[4];

  await assert.rejects(
    validateCategoryParentRelationship(
      userId,
      categoryId,
      categoryId,
      "EXPENSE",
      db,
    ),
    /cycle/,
  );
  await assert.rejects(
    validateCategoryParentRelationship(
      userId,
      categoryId,
      parentId,
      "EXPENSE",
      db,
    ),
    /cycle/,
  );
  await assert.rejects(
    validateCategoryParentRelationship(
      userId,
      categoryId,
      parentId,
      "INCOME",
      db,
    ),
    /same type/,
  );
});
