import { z } from "zod";
import { body, HttpError, ok, route } from "../../../src/http";

const entry = z
  .object({
    schemaVersion: z.literal(1),
    timestamp: z.string(),
    level: z.enum([
      "TRACE",
      "DEBUG",
      "INFO",
      "SUCCESS",
      "WARN",
      "ERROR",
      "FATAL",
    ]),
    kind: z.enum(["request", "event", "database", "error", "stack"]),
    service: z.string().max(100),
    environment: z.string().max(50),
    runtime: z.enum(["browser", "mobile", "desktop"]),
  })
  .passthrough();

export const POST = route(async (request: Request) => {
  const { entries } = z
    .object({ entries: z.array(entry).min(1).max(100) })
    .parse(await body(request));
  const endpoint = process.env.TELEMETRY_INGEST_URL;
  if (!endpoint)
    throw new HttpError(
      503,
      "TELEMETRY_NOT_CONFIGURED",
      "Telemetry ingestion is not configured",
    );
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(process.env.TELEMETRY_INGEST_TOKEN
        ? { authorization: `Bearer ${process.env.TELEMETRY_INGEST_TOKEN}` }
        : {}),
    },
    body: JSON.stringify({ entries }),
  });
  if (!response.ok)
    throw new HttpError(
      502,
      "TELEMETRY_UPSTREAM_FAILED",
      "Telemetry delivery failed",
    );
  return ok({ accepted: entries.length }, 202);
});
