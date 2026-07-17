import assert from "node:assert/strict";
import test from "node:test";
import {
  BudgetService,
  envelopeProjection,
  previewBudgetModeConversion,
  readyToAssign,
  spendingLimitProjection,
  type BudgetRecord,
} from "../../packages/services/src/budget/index";

test("spending limits warn without changing the source amounts", () => {
  assert.deepEqual(spendingLimitProjection("8000", "8300"), {
    mode: "SPENDING_LIMIT",
    limit: "8000.0000",
    spent: "8300.0000",
    remaining: "-300.0000",
    exceeded: true,
  });
});

test("envelopes derive available money from assignments, activity, and transfers", () => {
  assert.deepEqual(
    envelopeProjection({
      assigned: "8000",
      activity: "6300",
      carryOver: "500",
      incomingTransfers: "250",
      outgoingTransfers: "100",
    }),
    {
      mode: "ENVELOPE",
      assigned: "8000.0000",
      activity: "6300.0000",
      carryOver: "500.0000",
      incomingTransfers: "250.0000",
      outgoingTransfers: "100.0000",
      available: "2350.0000",
    },
  );
  assert.equal(readyToAssign("25000", "22000"), "3000.0000");
});

test("mode conversion is a preview and preserves the source plan", () => {
  const source: BudgetRecord = {
    id: "00000000-0000-4000-8000-000000000001",
    userId: "00000000-0000-4000-8000-000000000002",
    name: "Food",
    amount: "8000.0000",
    currency: "INR",
    startsOn: "2026-07-01",
    endsOn: "2026-07-31",
    mode: "SPENDING_LIMIT",
    rolloverPolicy: "NONE",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    deletedAt: null,
  };
  const preview = previewBudgetModeConversion(source);
  assert.equal(preview.to, "ENVELOPE");
  assert.equal(preview.suggestedAmount, "8000.0000");
  assert.equal(source.mode, "SPENDING_LIMIT");
});

test("confirmed conversion creates a replacement before archiving its source", async () => {
  const sourceId = "00000000-0000-4000-8000-000000000001";
  const targetId = "00000000-0000-4000-8000-000000000003";
  const userId = "00000000-0000-4000-8000-000000000002";
  const source: BudgetRecord = {
    id: sourceId,
    userId,
    name: "Food",
    amount: "8000.0000",
    currency: "INR",
    startsOn: "2026-07-01",
    endsOn: "2026-07-31",
    mode: "SPENDING_LIMIT",
    rolloverPolicy: "NONE",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    deletedAt: null,
  };
  const operations: string[] = [];
  const service = new BudgetService(
    {
      create: async (value) => {
        operations.push(`create:${value.id}`);
      },
      findById: async () => source,
      listForPeriod: async () => [source],
      update: async () => {},
      delete: async (id) => {
        operations.push(`archive:${id}`);
      },
    },
    () => targetId,
    () => "2026-07-17T00:00:00.000Z",
  );
  const target = await service.convertMode(sourceId, userId);
  assert.equal(target.mode, "ENVELOPE");
  assert.deepEqual(operations, [`create:${targetId}`, `archive:${sourceId}`]);
});
