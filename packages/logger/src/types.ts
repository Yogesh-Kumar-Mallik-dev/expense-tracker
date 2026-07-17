export type LogLevel =
  | "TRACE"
  | "DEBUG"
  | "INFO"
  | "SUCCESS"
  | "WARN"
  | "ERROR"
  | "FATAL";

export type LogKind = "request" | "event" | "database" | "error" | "stack";
export type RuntimeTarget = "node" | "browser" | "mobile" | "desktop";

export interface RequestMetadata {
  requestId: string;
  sequence: number;
  requestIdSource: "incoming" | "generated";
  duplicateRequestId: boolean;
  method: string;
  path: string;
  ip: string;
  source: string;
  browser: string;
  client: string;
  userAgent: string;
  startedAt: number;
  userId: string | null;
}

export interface ResponseMetadata {
  status: number;
  durationMs: number;
  success: boolean;
  sizeBytes: number | null;
}

export interface DatabaseMetadata {
  engine: "prisma" | "drizzle";
  model: string | null;
  operation: string | null;
  durationMs: number;
  rows: number | null;
  slow: boolean;
}

export interface RateLimitMetadata {
  limit: number;
  remaining: number;
  resetAt: number;
  blocked: boolean;
}

export interface StructuredError {
  errorId: string;
  name: string;
  message: string;
  code: string | null;
  cause: string | null;
  stack: string | null;
}

export interface LogEntry {
  schemaVersion: 1;
  timestamp: string;
  level: LogLevel;
  kind: LogKind;
  service: string;
  environment: string;
  runtime: RuntimeTarget;
  request: RequestMetadata | null;
  response: ResponseMetadata | null;
  database: DatabaseMetadata | null;
  rateLimit: RateLimitMetadata | null;
  registry: string | null;
  handler: string | null;
  operation: string | null;
  message: string | null;
  error: StructuredError | null;
  memoryMb: number | null;
  fields: Record<string, string | number | boolean | null>;
}

export interface LogTransport {
  write(entry: LogEntry): void | Promise<void>;
  flush?(): Promise<void>;
}

export interface LoggerOptions {
  service: string;
  environment?: string;
  runtime?: RuntimeTarget;
  level?: LogLevel;
  transports: LogTransport[];
  transformUserId?: (userId: string) => string;
  now?: () => Date;
}
