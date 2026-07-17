# Logger Architecture

The logger emits structured entries first and renders them through transports:

```text
Next.js / client / database adapter
              │
              ▼
        structured Logger
              │
       ┌──────┼─────────┐
       ▼      ▼         ▼
   box UI   JSONL   client diagnostics
```

## Visual contract

Boxes are available in every environment. A failed request produces linked
output:

1. a structured error box;
2. a stack-only box titled with the error ID and containing only the error-ID
   reference and stack trace;
3. the request completion box containing `Error: {errorId}`.

Production terminal stacks are hidden unless `LOG_STACKS=true`, but stack
entries remain in JSON output. The severity scale remains:

`TRACE`, `DEBUG`, `INFO`, `SUCCESS`, `WARN`, `ERROR`, `FATAL`.

## Correlation

Valid incoming `X-Request-ID` values are preserved. Accepted IDs contain 8–64
ASCII letters, digits, `_`, or `-`. Invalid or absent values produce:

```text
ET-YYYYMMDD-000001-A1B2
```

The process-local sequence is also stored separately. Errors append `-E01`,
`-E02`, and so on. Repeated incoming IDs are preserved but marked with
`duplicateRequestId`.

The API returns the effective ID through `X-Request-ID`. Async request context
allows authentication to attach the plain `userId`. A `transformUserId` hook
keeps the representation replaceable when authorized reversible protection is
introduced later.

## Safe data policy

Fields are allowlist-oriented scalar metadata. Names containing authorization,
cookie, token, password, secret, query, SQL, or body are discarded. Raw
requests, bodies, headers, database arguments, and SQL are never part of the
shared entry.

User-Agent and forwarding data are diagnostic only. Proxy addresses are read
only when `TRUST_PROXY=true`; the deployment proxy must overwrite untrusted
forwarding headers.

## JSON files

The Node transport writes one JSON entry per line to:

```text
logs/expense-tracker-YYYY-MM-DD.jsonl
```

Files rotate daily and after 25 MB. Files older than 14 days are removed. New
files use owner-only permissions where supported. Writes are queued to maintain
line integrity, and `logger.flush()` waits for queued output.

## Client diagnostics

Browser and mobile-compatible transports use fixed-width, non-ANSI boxes so
unsupported color sequences cannot break developer consoles. Entries are held
in a bounded memory buffer and can be exported as JSONL. Browser consumers can
trigger a download; native consumers receive the JSONL string and hand it to a
platform sharing API.

## Database operations

Prisma and Drizzle adapters capture engine, model, operation, duration, affected
rows, and slow status. They never capture query text or arguments.

- Prisma slow threshold: 500 ms.
- Drizzle slow threshold: 250 ms.
- Development doubles both thresholds.
- Normal successes log at `DEBUG`.
- Slow successes log at `WARN`.
- Failures emit linked structured-error, stack, and database-operation entries.

A non-database request leaves `database` as `null`.

## Operational limits

Generated sequences and duplicate-ID detection are process-local. Incoming IDs
provide cross-system correlation, while the random suffix reduces collision
risk for generated IDs. Multiple backend instances do not share the sequence.

JSON file rotation is intended for long-running Node deployments. Serverless
filesystems may be ephemeral; retain the transport API but send JSON entries to
a durable external destination in that environment.
