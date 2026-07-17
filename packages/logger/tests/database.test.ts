import assert from "node:assert/strict";
import test from "node:test";
import { logDrizzleOperation, logPrismaOperation } from "../src/database";
import { Logger } from "../src/logger";
import type { LogEntry, LogTransport } from "../src/types";

class CaptureTransport implements LogTransport {
  entries: LogEntry[] = [];
  write(entry: LogEntry) {
    this.entries.push(entry);
  }
}

test("database adapters record engine, operation, duration, and rows", async () => {
  const transport = new CaptureTransport();
  const logger = new Logger({
    service: "test",
    level: "TRACE",
    transports: [transport],
  });
  const prismaResult = await logPrismaOperation(
    logger,
    { model: "Account", operation: "findMany" },
    async () => [{ id: "one" }, { id: "two" }],
  );
  await logDrizzleOperation(
    logger,
    { model: "Transaction", operation: "insert" },
    async () => ({ count: 1 }),
  );
  assert.equal(prismaResult.length, 2);
  assert.equal(transport.entries[0]?.database?.engine, "prisma");
  assert.equal(transport.entries[0]?.database?.rows, 2);
  assert.equal(transport.entries[1]?.database?.engine, "drizzle");
  assert.equal(transport.entries[1]?.database?.rows, 1);
});

test("database failures emit detail, stack, and operation entries", async () => {
  const transport = new CaptureTransport();
  const logger = new Logger({
    service: "test",
    level: "TRACE",
    transports: [transport],
  });
  await assert.rejects(
    logPrismaOperation(
      logger,
      {
        model: "Account",
        operation: "create",
        errorId: "REQUEST-E01",
      },
      async () => {
        throw new Error("constraint");
      },
    ),
  );
  assert.deepEqual(
    transport.entries.map((entry) => entry.kind),
    ["error", "stack", "database"],
  );
  assert.equal(transport.entries[0]?.error?.errorId, "REQUEST-E01");
});
