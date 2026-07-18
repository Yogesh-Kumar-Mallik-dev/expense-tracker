import assert from "node:assert/strict";
import test from "node:test";
import { BatchedHttpTransport } from "../../packages/logger/src/browser";
import type { LogEntry } from "../../packages/logger/src/types";

const entry: LogEntry = {
  schemaVersion: 1,
  timestamp: "2026-07-18T00:00:00.000Z",
  level: "INFO",
  kind: "event",
  service: "test",
  environment: "test",
  runtime: "browser",
  request: null,
  response: null,
  database: null,
  rateLimit: null,
  registry: null,
  handler: null,
  operation: null,
  message: "batched",
  error: null,
  memoryMb: null,
  fields: {},
};

test("HTTP telemetry batches entries without exposing a credential", async () => {
  const originalFetch = globalThis.fetch;
  const requests: RequestInit[] = [];
  globalThis.fetch = async (_input, init) => {
    requests.push(init ?? {});
    return new Response(null, { status: 202 });
  };
  try {
    const transport = new BatchedHttpTransport("/api/telemetry", 2, 60_000);
    transport.write(entry);
    transport.write({ ...entry, message: "second" });
    await transport.flush();

    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0]?.headers, {
      "content-type": "application/json",
    });
    const payload = JSON.parse(String(requests[0]?.body)) as {
      entries: LogEntry[];
    };
    assert.deepEqual(
      payload.entries.map(({ message }) => message),
      ["batched", "second"],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
