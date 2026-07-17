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

export function createClientLogger(
  options: Omit<LoggerOptions, "transports" | "runtime"> & {
    runtime: Exclude<RuntimeTarget, "node">;
    transport?: BrowserDiagnosticsTransport;
  },
) {
  const transport = options.transport ?? new BrowserDiagnosticsTransport();
  return {
    logger: new Logger({ ...options, transports: [transport] }),
    diagnostics: transport,
  };
}
