import type { Logger } from "./logger";
import type { RequestMetadata } from "./types";

export interface DatabaseOperation {
  model?: string | null;
  operation?: string | null;
  rows?: (result: unknown) => number | null;
  request?: RequestMetadata | null;
  fields?: Record<string, unknown>;
  errorId?: string;
}

export async function logPrismaOperation<T>(
  logger: Logger,
  metadata: DatabaseOperation,
  operation: () => Promise<T>,
) {
  return logDatabaseOperation(logger, "prisma", metadata, operation);
}

export async function logDrizzleOperation<T>(
  logger: Logger,
  metadata: DatabaseOperation,
  operation: () => Promise<T>,
) {
  return logDatabaseOperation(logger, "drizzle", metadata, operation);
}

async function logDatabaseOperation<T>(
  logger: Logger,
  engine: "prisma" | "drizzle",
  metadata: DatabaseOperation,
  operation: () => Promise<T>,
) {
  const startedAt = performance.now();
  const baseThreshold = engine === "prisma" ? 500 : 250;
  const threshold =
    typeof process !== "undefined" && process.env.NODE_ENV === "development"
      ? baseThreshold * 2
      : baseThreshold;
  try {
    const result = await operation();
    const durationMs = performance.now() - startedAt;
    const slow = durationMs >= threshold;
    logger.write({
      level: slow ? "WARN" : "DEBUG",
      kind: "database",
      request: metadata.request ?? null,
      database: {
        engine,
        model: metadata.model ?? null,
        operation: metadata.operation ?? null,
        durationMs,
        rows: metadata.rows?.(result) ?? inferRows(result),
        slow,
      },
      message: slow
        ? `Slow ${engine} operation`
        : `${engine} operation completed`,
      ...(metadata.fields ? { fields: metadata.fields } : {}),
    });
    return result;
  } catch (error) {
    const durationMs = performance.now() - startedAt;
    const database = {
      engine,
      model: metadata.model ?? null,
      operation: metadata.operation ?? null,
      durationMs,
      rows: null,
      slow: durationMs >= threshold,
    };
    logger.exception(
      metadata.request ?? null,
      error,
      metadata.errorId ?? `${metadata.request?.requestId ?? "DATABASE"}-E01`,
      {
        database,
        message: `${engine} operation failed`,
        ...(metadata.fields ? { fields: metadata.fields } : {}),
      },
    );
    logger.error({
      kind: "database",
      request: metadata.request ?? null,
      database,
      message: `${engine} operation failed`,
      ...(metadata.fields ? { fields: metadata.fields } : {}),
    });
    throw error;
  }
}

function inferRows(result: unknown) {
  if (Array.isArray(result)) return result.length;
  if (result && typeof result === "object" && "count" in result) {
    const count = result.count;
    return typeof count === "number" ? count : null;
  }
  return result === null || result === undefined ? 0 : 1;
}
