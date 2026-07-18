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
});
