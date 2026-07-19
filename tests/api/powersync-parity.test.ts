import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { uploadSchema } from "../../apps/api/src/powersync";

const synchronizedTables = [
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
];

test("PowerSync upload and download surfaces include every synchronized model", async () => {
  const [upload, streams, offlineSchema] = await Promise.all([
    readFile("../apps/api/src/powersync.ts", "utf8"),
    readFile("../powersync/sync-config.yaml", "utf8"),
    readFile("../packages/db-offline/src/schema/index.ts", "utf8"),
  ]);
  const offlineNames: Record<string, string> = {
    User: "users",
    Account: "accounts",
    Category: "categories",
    Budget: "budgets",
    BudgetCategory: "budgetCategories",
    EnvelopeAllocation: "envelopeAllocations",
    BudgetTransfer: "budgetTransfers",
    Transaction: "transactions",
    Tag: "tags",
    TransactionTag: "transactionTags",
    Attachment: "attachments",
    Device: "devices",
    SyncState: "syncStates",
  };
  for (const table of synchronizedTables) {
    assert.match(upload, new RegExp(`"${table}"`), `${table} upload missing`);
    assert.match(
      streams,
      new RegExp(`FROM "${table}"|JOIN "${table}"`),
      `${table} stream missing`,
    );
    assert.match(
      offlineSchema,
      new RegExp(`\\b${offlineNames[table]}\\b`),
      `${table} offline schema missing`,
    );
  }
});

test("PowerSync upload contracts reject server fields and accept envelope activity", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  assert.equal(
    uploadSchema.safeParse({
      operations: [
        {
          op: "PATCH",
          table: "Account",
          id,
          data: { passwordHash: "forbidden" },
        },
      ],
    }).success,
    false,
  );
  assert.equal(
    uploadSchema.safeParse({
      operations: [
        {
          op: "PUT",
          table: "EnvelopeAllocation",
          id,
          data: {
            budgetId: id,
            categoryId: id,
            amount: "10.0000",
            occurredAt: "2026-07-18",
            createdAt: "2026-07-18T00:00:00.000Z",
          },
        },
      ],
    }).success,
    true,
  );
  assert.equal(
    uploadSchema.safeParse({
      operations: [
        {
          op: "PATCH",
          table: "Account",
          id,
          data: { deletedAt: "2026-07-19T00:00:00.000Z" },
        },
      ],
    }).success,
    false,
  );
});

test("PowerSync rejects privileged profile and attachment mutations", () => {
  const userId = "00000000-0000-4000-8000-000000000001";
  const attachmentId = "00000000-0000-4000-8000-000000000002";
  const rejectedOperations = [
    {
      op: "PUT",
      table: "User",
      id: userId,
      data: {
        email: "profile@example.com",
        name: "Profile",
        currency: "INR",
        timezone: "Asia/Kolkata",
      },
    },
    {
      op: "PATCH",
      table: "User",
      id: userId,
      data: { email: "unverified@example.com" },
    },
    {
      op: "PATCH",
      table: "User",
      id: userId,
      data: { deletedAt: "2026-07-19T00:00:00.000Z" },
    },
    { op: "DELETE", table: "User", id: userId },
    {
      op: "PATCH",
      table: "Attachment",
      id: attachmentId,
      data: {
        storageKey:
          "users/another-user/transactions/another-transaction/file.pdf",
      },
    },
    {
      op: "PUT",
      table: "Attachment",
      id: attachmentId,
      data: {},
    },
  ] as const;

  for (const operation of rejectedOperations) {
    assert.equal(
      uploadSchema.safeParse({ operations: [operation] }).success,
      false,
      `${operation.op} ${operation.table} should be rejected`,
    );
  }

  assert.equal(
    uploadSchema.safeParse({
      operations: [
        {
          op: "PATCH",
          table: "User",
          id: userId,
          data: {
            name: "Updated name",
            currency: "INR",
            timezone: "Asia/Kolkata",
            updatedAt: "2026-07-19T00:00:00.000Z",
          },
        },
      ],
    }).success,
    true,
  );
});

test("fresh platform databases do not bootstrap a synchronized User write", async () => {
  const platformBootstraps = await Promise.all([
    readFile("../apps/web/src/bootstrap/offline.ts", "utf8"),
    readFile("../apps/desktop/src/offline.ts", "utf8"),
    readFile("../apps/mobile/src/offline.ts", "utf8"),
  ]);

  for (const bootstrap of platformBootstraps) {
    assert.doesNotMatch(
      bootstrap,
      /\.insert\(\s*users\s*\)/,
      "session bootstrap must not enqueue a User PUT",
    );
    assert.doesNotMatch(
      bootstrap,
      /(?:import|,\s*)\s*users(?:\s*,|\s*})/,
      "platform bootstrap must not import the synchronized User table",
    );
  }
});
