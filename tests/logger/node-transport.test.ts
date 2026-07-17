import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { Logger } from "../../packages/logger/src/logger";
import { JsonFileTransport } from "../../packages/logger/src/node";

test("JSON transport writes parseable JSONL and rotates by size", async () => {
  const directory = await mkdtemp(join(tmpdir(), "expense-logger-"));
  try {
    const transport = new JsonFileTransport({
      directory,
      maxBytes: 1,
      retentionDays: 14,
    });
    const logger = new Logger({
      service: "test",
      environment: "test",
      level: "TRACE",
      transports: [transport],
      now: () => new Date("2026-07-17T00:00:00.000Z"),
    });
    logger.info({ message: "first" });
    logger.info({ message: "second" });
    await logger.flush();

    const files = (await readdir(directory)).sort();
    assert.deepEqual(files, [
      "expense-tracker-2026-07-17-1.jsonl",
      "expense-tracker-2026-07-17.jsonl",
    ]);
    const first = JSON.parse(
      (await readFile(join(directory, files[1]!), "utf8")).trim(),
    ) as { schemaVersion: number; message: string };
    assert.equal(first.schemaVersion, 1);
    assert.equal(first.message, "first");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
