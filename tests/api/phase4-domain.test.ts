import assert from "node:assert/strict";
import test from "node:test";
import { nextScheduleDate, scheduleInput } from "../../apps/api/src/phase4";

test("monthly schedules clamp to the final day without drifting", () => {
  assert.equal(nextScheduleDate("2026-01-31", "MONTHLY", 1), "2026-02-28");
  assert.equal(nextScheduleDate("2028-01-31", "MONTHLY", 1), "2028-02-29");
  assert.equal(
    nextScheduleDate("2026-02-28", "MONTHLY", 1, "2026-01-31"),
    "2026-03-31",
  );
});

test("schedule input rejects zero amounts and invalid intervals", () => {
  const base = {
    accountId: "00000000-0000-4000-8000-000000000001",
    transferAccountId: null,
    categoryId: null,
    type: "EXPENSE" as const,
    amount: "10.0000",
    currency: "USD",
    description: null,
    note: null,
    frequency: "MONTHLY" as const,
    interval: 1,
    startsOn: "2026-07-18",
    endsOn: null,
  };
  assert.equal(scheduleInput.safeParse(base).success, true);
  assert.equal(
    scheduleInput.safeParse({ ...base, amount: "0.0000" }).success,
    false,
  );
  assert.equal(
    scheduleInput.safeParse({ ...base, interval: 0 }).success,
    false,
  );
});
