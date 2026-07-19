import assert from "node:assert/strict";
import test from "node:test";
import { HttpError } from "../../apps/api/src/http";
import {
  attachmentQuerySchema,
  categoryOptionsQuerySchema,
  financialPeriodQuerySchema,
  instantPeriodQuerySchema,
  parseQuery,
  transactionQuerySchema,
} from "../../apps/api/src/query";

function url(query: string) {
  return new URL(`https://api.example.test/resource?${query}`);
}

function invalid(
  schema: Parameters<typeof parseQuery>[0],
  query: string,
  keys: string[],
) {
  assert.throws(
    () => parseQuery(schema, url(query), keys),
    (error) => error instanceof HttpError && error.status === 400,
  );
}

test("transaction query rejects malformed database values before adapters", () => {
  invalid(transactionQuerySchema, "accountId=not-a-uuid", ["accountId"]);
  invalid(transactionQuerySchema, "categoryId=not-a-uuid", ["categoryId"]);
  invalid(transactionQuerySchema, "from=not-a-date", ["from"]);
  invalid(transactionQuerySchema, `search=${"x".repeat(201)}`, ["search"]);
  invalid(
    transactionQuerySchema,
    "from=2026-07-20T00%3A00%3A00.000Z&to=2026-07-19T00%3A00%3A00.000Z",
    ["from", "to"],
  );
});

test("period queries reject impossible, malformed, and reversed ranges", () => {
  invalid(financialPeriodQuerySchema, "from=2026-02-30&to=2026-03-01", [
    "from",
    "to",
  ]);
  invalid(financialPeriodQuerySchema, "from=2026-03-02&to=2026-03-01", [
    "from",
    "to",
  ]);
  invalid(instantPeriodQuerySchema, "from=2026-07-19&to=2026-07-20", [
    "from",
    "to",
  ]);
});

test("resource filters accept only documented values", () => {
  invalid(categoryOptionsQuerySchema, "type=TRANSFER", [
    "type",
    "includeArchived",
  ]);
  invalid(categoryOptionsQuerySchema, "includeArchived=yes", [
    "type",
    "includeArchived",
  ]);
  invalid(attachmentQuerySchema, "transactionId=invalid", ["transactionId"]);

  assert.deepEqual(
    parseQuery(
      categoryOptionsQuerySchema,
      url("type=EXPENSE&includeArchived=true"),
      ["type", "includeArchived"],
    ),
    { type: "EXPENSE", includeArchived: true },
  );
});
