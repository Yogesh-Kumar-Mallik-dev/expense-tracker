import { AsyncLocalStorage } from "node:async_hooks";
import { mkdir, readdir, stat, unlink, appendFile } from "node:fs/promises";
import { join } from "node:path";
import { formatBox } from "./formatter";
import { Logger } from "./logger";
import type { LogEntry, LogTransport, LoggerOptions } from "./types";
import type { RequestScope } from "./request";

const requestStorage = new AsyncLocalStorage<RequestScope>();

export function runWithRequest<T>(scope: RequestScope, callback: () => T): T {
  return requestStorage.run(scope, callback);
}

export function currentRequest() {
  return requestStorage.getStore();
}

export function setCurrentUser(userId: string) {
  const scope = currentRequest();
  if (scope) scope.request.userId = userId;
}

export class BoxConsoleTransport implements LogTransport {
  constructor(
    private readonly options: {
      color?: boolean;
      stacks?: boolean;
    } = {},
  ) {}

  write(entry: LogEntry) {
    const showStacks =
      this.options.stacks ??
      (process.env.NODE_ENV !== "production" ||
        process.env.LOG_STACKS === "true");
    if (entry.kind === "stack" && !showStacks) {
      return;
    }
    const output = formatBox(entry, {
      color: this.options.color ?? process.env.NO_COLOR === undefined,
      width: process.stdout.columns,
      includeStack: entry.kind === "stack",
    });
    if (entry.level === "FATAL" || entry.level === "ERROR")
      console.error(output);
    else if (entry.level === "WARN") console.warn(output);
    else console.log(output);
  }
}

export class JsonFileTransport implements LogTransport {
  private queue = Promise.resolve();
  private activeDate = "";
  private part = 0;

  constructor(
    private readonly options: {
      directory?: string;
      maxBytes?: number;
      retentionDays?: number;
    } = {},
  ) {}

  write(entry: LogEntry) {
    this.queue = this.queue
      .then(() => this.append(entry))
      .catch((error) => {
        console.error("Logger JSON transport failed", error);
      });
  }

  flush() {
    return this.queue;
  }

  private async append(entry: LogEntry) {
    const directory = this.options.directory ?? join(process.cwd(), "logs");
    const maxBytes = this.options.maxBytes ?? 25 * 1024 * 1024;
    const date = entry.timestamp.slice(0, 10);
    if (this.activeDate !== date) {
      this.activeDate = date;
      this.part = 0;
      await mkdir(directory, { recursive: true });
      await this.removeExpired(directory);
    }
    let path = this.path(directory, date);
    try {
      const file = await stat(path);
      if (file.size >= maxBytes) {
        this.part += 1;
        path = this.path(directory, date);
      }
    } catch {
      // The first entry creates the file.
    }
    await appendFile(path, `${JSON.stringify(entry)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
  }

  private path(directory: string, date: string) {
    const suffix = this.part === 0 ? "" : `-${this.part}`;
    return join(directory, `expense-tracker-${date}${suffix}.jsonl`);
  }

  private async removeExpired(directory: string) {
    const retentionMs = (this.options.retentionDays ?? 14) * 86_400_000;
    const cutoff = Date.now() - retentionMs;
    for (const name of await readdir(directory)) {
      if (!/^expense-tracker-\d{4}-\d{2}-\d{2}(?:-\d+)?\.jsonl$/.test(name))
        continue;
      const path = join(directory, name);
      if ((await stat(path)).mtimeMs < cutoff) await unlink(path);
    }
  }
}

export function createNodeLogger(
  options: Omit<LoggerOptions, "transports" | "runtime"> & {
    transports?: LogTransport[];
    jsonDirectory?: string;
  },
) {
  return new Logger({
    ...options,
    runtime: "node",
    transports: options.transports ?? [
      new BoxConsoleTransport(),
      new JsonFileTransport(
        options.jsonDirectory ? { directory: options.jsonDirectory } : {},
      ),
    ],
  });
}

export * from "./request";
