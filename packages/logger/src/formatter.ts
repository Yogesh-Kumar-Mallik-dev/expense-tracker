import type { LogEntry, LogLevel } from "./types";

const ansi = {
  reset: "\u001b[0m",
  dim: "\u001b[2m",
  TRACE: "\u001b[90m",
  DEBUG: "\u001b[36m",
  INFO: "\u001b[34m",
  SUCCESS: "\u001b[32m",
  WARN: "\u001b[33m",
  ERROR: "\u001b[31m",
  FATAL: "\u001b[35m",
} satisfies Record<LogLevel | "reset" | "dim", string>;

export interface FormatOptions {
  color?: boolean;
  width?: number;
  includeStack?: boolean;
}

export function formatBox(entry: LogEntry, options: FormatOptions = {}) {
  const color = options.color ?? true;
  const width = Math.max(72, Math.min(options.width ?? 110, 160));
  const request = entry.request;
  const stackEntry = entry.kind === "stack";
  const title =
    stackEntry && entry.error
      ? `STACK  [${entry.error.errorId}]`
      : [
          entry.level,
          request ? `[${request.requestId}]` : null,
          request?.method,
          request?.path,
        ]
          .filter(Boolean)
          .join("  ");
  const rows: Array<[string, string]> = stackEntry
    ? [
        ["Error ID", entry.error?.errorId ?? "Unavailable"],
        [
          "Stack",
          options.includeStack
            ? (entry.error?.stack ?? "Stack unavailable")
            : "Stack output disabled",
        ],
      ]
    : [
        ["Time", new Date(entry.timestamp).toLocaleString()],
        ["Service", entry.service],
      ];
  if (stackEntry) return renderBox(title, rows, width, entry.level, color);
  if (request) {
    rows.push(
      ["Sequence", String(request.sequence)],
      ["Client", `${request.browser} (${request.client})`],
      ["Source", request.source],
      ["IP", request.ip],
      ["User", request.userId ?? "—"],
    );
    if (request.duplicateRequestId) rows.push(["Duplicate ID", "Yes"]);
  }
  if (entry.registry) rows.push(["Registry", entry.registry]);
  if (entry.handler) rows.push(["Handler", entry.handler]);
  if (entry.operation) rows.push(["Operation", entry.operation]);
  if (entry.database) {
    rows.push(
      ["Database", entry.database.engine],
      ["Model", entry.database.model ?? "—"],
      ["DB operation", entry.database.operation ?? "—"],
      ["DB duration", duration(entry.database.durationMs)],
      [
        "Rows",
        entry.database.rows === null ? "—" : String(entry.database.rows),
      ],
    );
  }
  if (entry.rateLimit) {
    rows.push(
      ["Tries/min", String(entry.rateLimit.limit - entry.rateLimit.remaining)],
      ["Blocked", entry.rateLimit.blocked ? "Yes" : "No"],
    );
  }
  if (entry.response) {
    rows.push(
      ["Status", String(entry.response.status)],
      ["Duration", duration(entry.response.durationMs)],
    );
    if (entry.response.sizeBytes !== null) {
      rows.push(["Size", bytes(entry.response.sizeBytes)]);
    }
  }
  if (entry.message) rows.push(["Message", entry.message]);
  if (entry.error) {
    rows.push(
      ["Error ID", entry.error.errorId],
      ["Error type", entry.error.name],
      ["Error code", entry.error.code ?? "—"],
      ["Cause", entry.error.cause ?? "—"],
    );
    if (entry.kind === "error") rows.push(["Error", entry.error.message]);
  }
  for (const [key, value] of Object.entries(entry.fields)) {
    rows.push([label(key), String(value ?? "—")]);
  }
  if (entry.memoryMb !== null)
    rows.push(["Memory", `${entry.memoryMb.toFixed(2)} MB`]);

  return renderBox(title, rows, width, entry.level, color);
}

function renderBox(
  title: string,
  rows: Array<[string, string]>,
  width: number,
  level: LogLevel,
  color: boolean,
) {
  const top = `╭${"─".repeat(width - 2)}╮`;
  const divider = `├${"─".repeat(width - 2)}┤`;
  const bottom = `╰${"─".repeat(width - 2)}╯`;
  const lines = [
    top,
    ...wrap(title, width - 4).map((line) =>
      boxLine(paint(line, level, color), width),
    ),
    divider,
    ...rows.flatMap(([name, value]) => formatRow(name, value, width)),
    bottom,
  ];
  return lines.join("\n");
}

function formatRow(name: string, value: string, width: number) {
  const prefix = `${name.padEnd(14)} │ `;
  const available = width - visible(prefix) - 4;
  const chunks = wrap(value, available);
  return chunks.map((chunk, index) =>
    boxLine(`${index === 0 ? prefix : " ".repeat(17)}${chunk}`, width),
  );
}

function boxLine(value: string, width: number) {
  return `│ ${value}${" ".repeat(Math.max(0, width - visible(value) - 4))} │`;
}

function wrap(value: string, width: number) {
  const lines: string[] = [];
  for (const sourceLine of value.split("\n")) {
    if (!sourceLine) lines.push("");
    for (let index = 0; index < sourceLine.length; index += width) {
      lines.push(sourceLine.slice(index, index + width));
    }
  }
  return lines.length ? lines : [""];
}

function paint(value: string, level: LogLevel, enabled: boolean) {
  return enabled ? `${ansi[level]}${value}${ansi.reset}` : value;
}

function visible(value: string) {
  return value.replace(/\u001b\[[0-9;]*m/g, "").length;
}

function duration(value: number) {
  return value < 1000
    ? `${value.toFixed(2)}ms`
    : `${(value / 1000).toFixed(2)}s`;
}

function bytes(value: number) {
  return value < 1024 ? `${value} B` : `${(value / 1024).toFixed(2)} KB`;
}

function label(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (v) => v.toUpperCase());
}
