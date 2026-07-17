import { normalizeError, safeFields } from "./sanitize";
import type {
  DatabaseMetadata,
  LogEntry,
  LogLevel,
  LoggerOptions,
  RateLimitMetadata,
  RequestMetadata,
  ResponseMetadata,
} from "./types";

const priority: Record<LogLevel, number> = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  SUCCESS: 3,
  WARN: 4,
  ERROR: 5,
  FATAL: 6,
};

export interface EntryInput {
  level: LogLevel;
  kind?: LogEntry["kind"];
  request?: RequestMetadata | null;
  response?: ResponseMetadata | null;
  database?: DatabaseMetadata | null;
  rateLimit?: RateLimitMetadata | null;
  registry?: string | null;
  handler?: string | null;
  operation?: string | null;
  message?: string | null;
  error?: import("./types").StructuredError | null;
  fields?: Record<string, unknown>;
}

export class Logger {
  private readonly configuredLevel: LogLevel;
  private readonly now: () => Date;

  constructor(private readonly options: LoggerOptions) {
    const candidate =
      typeof process !== "undefined"
        ? process.env.LOG_LEVEL?.toUpperCase()
        : undefined;
    this.configuredLevel =
      candidate && candidate in priority
        ? (candidate as LogLevel)
        : (options.level ?? "INFO");
    this.now = options.now ?? (() => new Date());
  }

  enabled(level: LogLevel) {
    return priority[level] >= priority[this.configuredLevel];
  }

  write(input: EntryInput) {
    if (!this.enabled(input.level)) return;
    const request = input.request
      ? {
          ...input.request,
          userId: input.request.userId
            ? (this.options.transformUserId?.(input.request.userId) ??
              input.request.userId)
            : null,
        }
      : null;
    const entry: LogEntry = {
      schemaVersion: 1,
      timestamp: this.now().toISOString(),
      level: input.level,
      kind: input.kind ?? "event",
      service: this.options.service,
      environment:
        this.options.environment ??
        (typeof process !== "undefined"
          ? (process.env.NODE_ENV ?? "development")
          : "unknown"),
      runtime: this.options.runtime ?? "node",
      request,
      response: input.response ?? null,
      database: input.database ?? null,
      rateLimit: input.rateLimit ?? null,
      registry: input.registry ?? null,
      handler: input.handler ?? null,
      operation: input.operation ?? null,
      message: input.message ?? null,
      error: input.error ?? null,
      memoryMb:
        typeof process !== "undefined" && process.memoryUsage
          ? process.memoryUsage().heapUsed / 1024 / 1024
          : null,
      fields: safeFields(input.fields),
    };
    for (const transport of this.options.transports) {
      void transport.write(entry);
    }
    return entry;
  }

  trace(input: Omit<EntryInput, "level">) {
    return this.write({ ...input, level: "TRACE" });
  }
  debug(input: Omit<EntryInput, "level">) {
    return this.write({ ...input, level: "DEBUG" });
  }
  info(input: Omit<EntryInput, "level">) {
    return this.write({ ...input, level: "INFO" });
  }
  success(input: Omit<EntryInput, "level">) {
    return this.write({ ...input, level: "SUCCESS" });
  }
  warn(input: Omit<EntryInput, "level">) {
    return this.write({ ...input, level: "WARN" });
  }
  error(input: Omit<EntryInput, "level">) {
    return this.write({ ...input, level: "ERROR" });
  }
  fatal(input: Omit<EntryInput, "level">) {
    return this.write({ ...input, level: "FATAL" });
  }

  exception(
    request: RequestMetadata | null,
    error: unknown,
    errorId: string,
    context: Omit<EntryInput, "level" | "request" | "error" | "kind"> = {},
  ) {
    const normalized = normalizeError(error, errorId);
    this.error({ ...context, kind: "error", request, error: normalized });
    this.error({ ...context, kind: "stack", request, error: normalized });
    return normalized;
  }

  async flush() {
    await Promise.all(
      this.options.transports.map((transport) => transport.flush?.()),
    );
  }
}
