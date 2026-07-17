import assert from "node:assert/strict";
import test from "node:test";
import { formatBox } from "../../packages/logger/src/formatter";
import { Logger } from "../../packages/logger/src/logger";
import {
  createRequestScope,
  nextErrorId,
  resetRequestIdsForTests,
} from "../../packages/logger/src/request";
import type {
  LogEntry,
  LogTransport,
} from "../../packages/logger/src/types";

class CaptureTransport implements LogTransport {
  entries: LogEntry[] = [];
  write(entry: LogEntry) {
    this.entries.push(entry);
  }
}

test("generated request IDs are sequential and error IDs are linked", () => {
  resetRequestIdsForTests();
  const first = createRequestScope(
    new Request("https://api.example.test/api/accounts"),
    { now: Date.UTC(2026, 6, 17), random: () => "abcd" },
  );
  const second = createRequestScope(
    new Request("https://api.example.test/api/accounts"),
    { now: Date.UTC(2026, 6, 17), random: () => "efgh" },
  );
  assert.equal(first.request.requestId, "ET-20260717-000001-ABCD");
  assert.equal(second.request.requestId, "ET-20260717-000002-EFGH");
  assert.equal(nextErrorId(first), "ET-20260717-000001-ABCD-E01");
  assert.equal(nextErrorId(first), "ET-20260717-000001-ABCD-E02");
});

test("valid incoming IDs are preserved and duplicates are identified", () => {
  resetRequestIdsForTests();
  const request = new Request("https://api.example.test/api/accounts", {
    headers: { "x-request-id": "CLIENT_REQUEST_01" },
  });
  const first = createRequestScope(request);
  const second = createRequestScope(request);
  assert.equal(first.request.requestId, "CLIENT_REQUEST_01");
  assert.equal(first.request.duplicateRequestId, false);
  assert.equal(second.request.duplicateRequestId, true);
});

test("logger filters levels, transforms user IDs, and redacts unsafe fields", () => {
  const transport = new CaptureTransport();
  const logger = new Logger({
    service: "test",
    environment: "test",
    runtime: "node",
    level: "WARN",
    transports: [transport],
    transformUserId: (value) => `future:${value}`,
    now: () => new Date("2026-07-17T00:00:00.000Z"),
  });
  const scope = createRequestScope(
    new Request("https://api.example.test/api/accounts"),
  );
  scope.request.userId = "user-id";
  logger.info({ message: "hidden" });
  logger.warn({
    request: scope.request,
    message: "visible",
    fields: {
      accountId: "safe",
      authorization: "secret",
      password: "secret",
    },
  });
  assert.equal(transport.entries.length, 1);
  assert.equal(transport.entries[0]?.request?.userId, "future:user-id");
  assert.deepEqual(transport.entries[0]?.fields, { accountId: "safe" });
});

test("exceptions create linked structured-error and stack entries", () => {
  const transport = new CaptureTransport();
  const logger = new Logger({
    service: "test",
    level: "TRACE",
    transports: [transport],
  });
  logger.exception(
    null,
    Object.assign(new Error("broken"), { code: "P2002" }),
    "REQ-E01",
  );
  assert.equal(transport.entries.length, 2);
  assert.equal(transport.entries[0]?.kind, "error");
  assert.equal(transport.entries[1]?.kind, "stack");
  assert.equal(transport.entries[0]?.error?.errorId, "REQ-E01");
  assert.equal(transport.entries[0]?.error?.code, "P2002");
});

test("box formatter keeps the visual request summary contract", () => {
  const transport = new CaptureTransport();
  const logger = new Logger({
    service: "test",
    level: "TRACE",
    transports: [transport],
    now: () => new Date("2026-07-17T00:00:00.000Z"),
  });
  const entry = logger.success({ message: "Request completed" });
  assert.ok(entry);
  const output = formatBox(entry, { color: false, width: 80 });
  assert.match(output, /^╭─+/);
  assert.match(output, /SUCCESS/);
  assert.match(output, /Request completed/);
  assert.match(output, /╰─+╯$/);
});

test("box formatter wraps long request headers without breaking its width", () => {
  resetRequestIdsForTests();
  const scope = createRequestScope(
    new Request(
      `https://api.example.test/api/${"very-long-segment/".repeat(12)}`,
    ),
  );
  const transport = new CaptureTransport();
  const logger = new Logger({
    service: "test",
    level: "TRACE",
    transports: [transport],
  });
  const entry = logger.success({ request: scope.request });
  assert.ok(entry);
  const output = formatBox(entry, { color: false, width: 80 });
  assert.equal(
    output.split("\n").every((line) => line.length <= 80),
    true,
  );
});
