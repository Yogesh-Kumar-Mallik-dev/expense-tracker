import { formatBox } from "./formatter";
import { Logger } from "./logger";
import type {
  LogEntry,
  LogTransport,
  LoggerOptions,
  RuntimeTarget,
} from "./types";

export class BrowserDiagnosticsTransport implements LogTransport {
  private readonly entries: LogEntry[] = [];

  constructor(private readonly maximumEntries = 5_000) {}

  write(entry: LogEntry) {
    this.entries.push(entry);
    if (this.entries.length > this.maximumEntries) this.entries.shift();
    const output = formatBox(entry, {
      color: false,
      width: 96,
      includeStack: entry.kind === "stack",
    });
    if (entry.level === "ERROR" || entry.level === "FATAL")
      console.error(output);
    else if (entry.level === "WARN") console.warn(output);
    else console.log(output);
  }

  exportJsonl() {
    return this.entries.map((entry) => JSON.stringify(entry)).join("\n");
  }

  download(
    filename = `expense-tracker-diagnostics-${new Date().toISOString()}.jsonl`,
  ) {
    if (typeof document === "undefined") return this.exportJsonl();
    const blob = new Blob([this.exportJsonl()], {
      type: "application/x-ndjson",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.replaceAll(":", "-");
    link.click();
    URL.revokeObjectURL(url);
  }
}

export class BatchedHttpTransport implements LogTransport {
  private queue: LogEntry[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  constructor(
    private readonly endpoint: string,
    private readonly batchSize = 25,
    private readonly intervalMs = 5_000,
    private readonly maximumQueuedEntries = 500,
  ) {}
  write(entry: LogEntry) {
    this.queue.push(entry);
    if (this.queue.length > this.maximumQueuedEntries) {
      this.queue.splice(0, this.queue.length - this.maximumQueuedEntries);
    }
    if (this.queue.length >= this.batchSize) void this.flush();
    else if (!this.timer)
      this.timer = setTimeout(() => void this.flush(), this.intervalMs);
  }
  async flush() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (!this.queue.length) return;
    const entries = this.queue.splice(0, this.batchSize);
    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entries }),
        keepalive: true,
      });
      if (!response.ok) this.requeue(entries);
    } catch {
      this.requeue(entries);
    }
  }

  private requeue(entries: LogEntry[]) {
    this.queue.unshift(...entries);
    if (this.queue.length > this.maximumQueuedEntries) {
      this.queue.length = this.maximumQueuedEntries;
    }
    if (!this.timer) {
      this.timer = setTimeout(() => void this.flush(), this.intervalMs);
    }
  }
}

export function createClientLogger(
  options: Omit<LoggerOptions, "transports" | "runtime"> & {
    runtime: Exclude<RuntimeTarget, "node">;
    transport?: BrowserDiagnosticsTransport;
    telemetryEndpoint?: string;
  },
) {
  const transport = options.transport ?? new BrowserDiagnosticsTransport();
  const transports: LogTransport[] = [transport];
  if (options.telemetryEndpoint)
    transports.push(new BatchedHttpTransport(options.telemetryEndpoint));
  return {
    logger: new Logger({ ...options, transports }),
    diagnostics: transport,
  };
}
