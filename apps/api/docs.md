# API Architecture

See [README.md](./README.md) for orientation and
[usage-guide.md](./usage-guide.md) for calling examples.

## Request flow

```text
HTTP request
  │
  ├── auth route ─────────────── Prisma authentication tables
  │
  ├── PowerSync upload ───────── one Prisma transaction
  │
  └── domain route
        │
        ├── bearer-token authentication
        ├── HTTP input translation
        ▼
      shared service
        │
        ▼
      db-main service adapter
        │
        ▼
      Prisma / PostgreSQL
```

Route Handlers own HTTP, authentication, and authorization. Shared services own
validation and domain behavior. Main-database adapters own persistence,
ownership filters, tombstones, and conversion between platform-neutral strings
and Prisma values.

The backend must never import `@expense-tracker/db-offline`.

## Source structure

```text
apps/api
├── app/api                       # Next.js Route Handlers
│   ├── auth                      # Registration and token lifecycle
│   ├── powersync                 # Credentials and upload
│   ├── reporting                 # Computed read models
│   └── ...                       # Domain resources
├── src
│   ├── auth                      # Password and token primitives
│   ├── env.ts                    # Environment validation
│   ├── http.ts                   # Response and error mapping
│   ├── powersync.ts              # Upload validation/application
│   ├── resources.ts              # Shared resource HTTP translation
│   └── services.ts               # Service composition root
└── tests
```

## Authentication

Passwords are hashed with Node's `scrypt` using a random 16-byte salt. Password
hashes never leave the server or enter the offline database.

Access tokens are HMAC-SHA256 signed tokens with a 15-minute lifetime. Protected
routes verify the signature, token type, expiration, and that the user remains
active.

Refresh tokens have a 30-day lifetime. Only their SHA-256 hashes are stored in
PostgreSQL. Refreshing revokes the presented token and issues a new token pair,
preventing normal replay of an already-used refresh token.

Logout requires both an access token and the refresh token to revoke. Profile
deletion writes a `deletedAt` tombstone; subsequent access-token checks reject
that user.

Authentication is deliberately separate from `UserService`, whose scope is
shared profile behavior.

## Authorization

The authenticated token is the sole source of `userId`. Domain request bodies
cannot select another owner; the backend overwrites any supplied `userId`.

Service adapters constrain normal reads, updates, and deletes by owner.
Assignment creation additionally verifies that both related records are
visible to the authenticated user before creating a join row.

Ownership-safe lookup failures return `404`, avoiding disclosure of whether
another user owns a given UUID.

## Domain and representation rules

- IDs are UUID strings.
- Timestamps use ISO 8601 strings at service and HTTP boundaries.
- Budget dates use `YYYY-MM-DD`.
- Money is always a decimal string and is never converted through JavaScript
  floating-point arithmetic.
- Synchronized deletes are idempotent tombstone writes.
- Transactions, tag assignments, and attachments remain independent row
  operations.
- Reports derive balances and usage from all non-tombstoned source rows; they
  do not persist counters.
- Mixed-currency report rows expose `excludedTransactionIds`.

## HTTP errors

| Condition                  | Status | Typical code               |
| -------------------------- | -----: | -------------------------- |
| Malformed JSON             |    400 | `INVALID_JSON`             |
| Invalid input              |    400 | `VALIDATION_ERROR`         |
| Missing credentials        |    401 | `UNAUTHORIZED`             |
| Invalid login              |    401 | `INVALID_CREDENTIALS`      |
| Ownership-safe absence     |    404 | `NOT_FOUND`                |
| Unique database constraint |    409 | `CONFLICT`                 |
| Missing related record     |    409 | `MISSING_PARENT`           |
| Rate limit exceeded        |    429 | `RATE_LIMITED`             |
| PowerSync unavailable      |    503 | `POWERSYNC_NOT_CONFIGURED` |
| Unexpected failure         |    500 | `INTERNAL_ERROR`           |

Validation errors may include a `fields` array. Internal exceptions are logged
on the server but are not returned to clients.

## Pagination

Every collection and assignment-list endpoint accepts:

- `page`: one-based page number, default `1`;
- `pageSize`: rows per page, default `25`, maximum `100`;
- `limit`: compatibility alias for `pageSize`.

The response `meta` object contains `page`, `pageSize`, `total`, `totalPages`,
`hasNext`, and `hasPrevious`. An empty result has `totalPages: 0`. Invalid,
zero, negative, non-integer, and excessive values return
`400 INVALID_PAGINATION`.

Pagination is intentionally not applied inside `ReportingService`. Reports must
read every matching source row or their balances and budget usage would be
incorrect.

## Rate limiting

The shared Route Handler wrapper applies a fixed 60-second window:

| Route policy          | Requests per window |
| --------------------- | ------------------: |
| Authentication routes |                  10 |
| PowerSync upload      |                  30 |
| Health                |                 300 |
| Other API routes      |                 120 |

Buckets use the client address, which means changing an invalid bearer token
cannot bypass pre-authentication protection. Responses include
`RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset`, together with
equivalent `X-RateLimit-*` compatibility headers. Rejected requests also
include `Retry-After`.

The current store is process-local and deliberately dependency-free. It is
useful for local development and a single long-running API instance. A
multi-instance or serverless production deployment must replace the map with a
shared atomic store such as Redis while preserving the same policy interface.
The application must only trust `X-Forwarded-For` when deployed behind a proxy
that overwrites untrusted forwarding headers.

## Logging and correlation

The shared route wrapper creates one request scope and emits one completion
summary for every endpoint. A valid incoming `X-Request-ID` is preserved;
otherwise the API generates a sequential expense-tracker ID. The effective ID
is returned in the response header.

Authentication attaches the current plain `userId` through the logger's
replaceable transformation hook. Rate-limit state, status, duration, client
description, source, and memory are included without collecting bodies,
credentials, raw queries, or database arguments.

Handled route exceptions receive request-derived IDs such as `REQUEST-E01`.
The logger emits a structured error box, a separate stack-only box titled with
that error ID, and a completion box referencing the same ID. The stack box does
not repeat request, client, handler, or memory metadata. JSONL receives all
three; production terminal stacks require `LOG_STACKS=true`.

See `packages/logger/docs.md` for transports, retention, database adapters, and
the stable structured entry.

## PowerSync contract

`GET /api/powersync/credentials` returns an endpoint and short-lived token for
the authenticated user. It returns `503` until PowerSync environment variables
are configured.

Tokens use RS256, include `kid`, `sub`, `aud`, `iss`, `iat`, and `exp`, and
expire after five minutes. `GET /api/auth/keys` publishes the matching public
JWKS without exposing private key material. The checked-in
`powersync/sync-config.yaml` uses edition 3 user-scoped Sync Streams.

`POST /api/powersync/upload` accepts:

```json
{
  "operations": [
    {
      "op": "PUT",
      "table": "Account",
      "id": "uuid",
      "data": {}
    }
  ]
}
```

The upload boundary:

- accepts at most 1,000 operations per batch;
- allowlists synchronized table names and `PUT`, `PATCH`, and `DELETE`;
- preserves client-generated row UUIDs;
- rejects cross-user ownership;
- permits only `name`, `currency`, `timezone`, and `updatedAt` profile patches;
- rejects synchronized user creation, email changes, and account deletion;
- keeps attachments download-only in PowerSync so object keys and lifecycle
  transitions remain server-controlled;
- strips server-only `passwordHash`;
- converts documented date fields to Prisma dates;
- turns `DELETE` into `deletedAt`;
- commits the complete operation list inside one `prisma.$transaction`.

If any operation fails, the transaction rolls back and the PowerSync client
keeps the local CRUD transaction queued. Unique violations become HTTP `409`
responses and should enter a permanent rename/merge recovery flow rather than
being retried forever.

## Environment and runtime

The backend uses the Node.js runtime because Prisma, PostgreSQL, `scrypt`, and
Node cryptography are not Edge-compatible. Node.js 20.19 or newer is required.

| Variable                       | Purpose                                             |
| ------------------------------ | --------------------------------------------------- |
| `DATABASE_URL`                 | PostgreSQL connection used by Prisma                |
| `WEB_APP_URL`                  | Public web origin used in email verification links  |
| `RESEND_API_KEY`               | Resend API key; required for email delivery in production |
| `EMAIL_FROM`                   | Verified sender used for email-change messages      |
| `ACCESS_TOKEN_SECRET`          | Access-token signing secret, at least 32 characters |
| `REFRESH_TOKEN_SECRET`         | Refresh-token signing secret                        |
| `POWERSYNC_URL`                | PowerSync service endpoint                          |
| `POWERSYNC_PRIVATE_KEY_BASE64` | Base64-encoded RSA private-key PEM                  |
| `POWERSYNC_KEY_ID`             | JWT/JWKS key identifier                             |
| `POWERSYNC_AUDIENCE`           | Audience configured in PowerSync                    |
| `POWERSYNC_ISSUER`             | Token issuer identifying this API                   |
| `ATTACHMENT_BUCKET`            | Private S3-compatible object bucket                 |
| `ATTACHMENT_REGION`            | Object-storage region                               |
| `ATTACHMENT_ENDPOINT`          | Optional S3-compatible endpoint                     |
| `ATTACHMENT_FORCE_PATH_STYLE`  | Enable path-style compatible-store requests         |
| `ATTACHMENT_ACCESS_KEY_ID`     | Optional static storage access key                  |
| `ATTACHMENT_SECRET_ACCESS_KEY` | Optional static storage secret                      |
| `ATTACHMENT_MAX_BYTES`         | Maximum accepted object size                        |
| `LOG_LEVEL`                    | Minimum boxed and JSON log severity                 |
| `LOG_DIRECTORY`                | Rotating JSONL output directory                     |
| `LOG_STACKS`                   | Show stack boxes in the production terminal         |
| `TRUST_PROXY`                  | Trust deployment-overwritten forwarding headers     |
| `CORS_ORIGINS`                 | Comma-separated browser origins allowed by the API   |
| `RETENTION_JOB_SECRET`         | Authenticates the internal retention job             |
| `TELEMETRY_INGEST_URL`         | Server-side telemetry destination                    |
| `TELEMETRY_INGEST_TOKEN`       | Optional server-side telemetry bearer token          |

The authoritative variable inventories are under
[`secrets/`](../../secrets/README.md). Secrets must not use example values and
must never be exposed to frontend bundles.

## Attachment binary lifecycle

Object storage is private and S3-compatible. The API never proxies binary
payloads through Next.js:

1. `POST /api/attachments/upload` validates transaction ownership, size, and
   metadata and returns a short-lived signed `PUT` URL.
2. The client uploads directly with the exact signed headers.
3. `POST /api/attachments/complete` verifies the object with `HeadObject` and
   only then persists attachment metadata.
4. `GET /api/attachments/:id/download` verifies ownership and returns a
   short-lived signed `GET` URL.

Storage keys are generated beneath user, transaction, and attachment UUID
prefixes. Completion rejects keys that do not exactly match this structure, and
download revalidates the stored prefix before signing a URL. `storageKey` is
never client-writable through PowerSync and remains immutable after completion.
The default size limit is 10 MiB.

Synchronized metadata tombstones do not immediately remove binary objects.
Production operations should run delayed garbage collection only after the
tombstone-retention window proves every client has observed deletion.

## Budget modes

Budget records support `SPENDING_LIMIT` (default) and `ENVELOPE`. Envelope
source operations are exposed at:

- `GET|POST /api/budgets/:id/allocations`
- `GET|POST /api/budgets/:id/transfers`
- `GET|POST /api/budgets/:id/conversion-preview`

The conversion `GET` previews warnings without mutation. `POST` creates the
replacement plan before tombstoning the source. Category ownership and
envelope mode are checked for every activity write.
