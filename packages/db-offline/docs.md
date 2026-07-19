# Offline Database

See [usage-guide.md](./usage-guide.md) for platform initialization and query
examples.

`@expense-tracker/db-offline` provides the SQLite database used by the web,
Expo/React Native, and Tauri applications. Drizzle supplies typed queries while
PowerSync manages local-first synchronization with PostgreSQL.

## Structure

```text
packages/db-offline
├── drizzle                     # Generated SQLite migration
├── index.ts                    # Source-level @db-offline entry
├── src
│   ├── driver                  # Web, mobile, and desktop factories
│   ├── powersync               # Connector and sync lifecycle
│   ├── repositories            # Drizzle data access
│   ├── schema                  # SQLite schema
│   ├── database.ts             # Drizzle/PowerSync bridge
│   └── index.ts                # Platform-neutral exports
└── drizzle.config.ts
```

Shared workspace code can import platform-neutral APIs, repositories, and schema
types through the root alias:

```ts
import { AccountRepository, setOfflineClient } from "@db-offline";
```

The alias resolves through the package-root `index.ts`, which re-exports the
public API from `src/index.ts`. Built package consumers can continue importing
from `@expense-tracker/db-offline`.

## Schema parity

The offline schema mirrors the user-facing models in `db-main`, including the
explicit `BudgetCategory` and `TransactionTag` join tables. Table and column
names match Prisma's PostgreSQL names so PowerSync CRUD uploads can be applied
without a second naming map.

SQLite representations differ where necessary:

- UUIDs are text.
- Timestamps and dates are ISO 8601 text.
- Decimal money is text to avoid floating-point precision loss.
- Booleans use integer columns with Drizzle boolean mapping.
- `User.passwordHash` is never stored offline.
- Refresh credentials are intentionally absent from SQLite. Web uses an
  HttpOnly cookie and native clients use their platform credential vault.

Every synchronized table includes a `deletedAt` tombstone. Repository reads hide
tombstones and repository delete methods update that field instead of issuing
SQLite `DELETE` statements. Required foreign keys are restrictive rather than
cascading. `SyncConflict` and `PendingAttachmentUpload` are local-only
operational tables and may hard-delete resolved or completed rows.

The PowerSync client schema is generated from the Drizzle tables using
`DrizzleAppSchema`, keeping one client-side schema definition.

## Platform drivers

Platform SDKs are isolated behind package subpath exports:

- `@expense-tracker/db-offline/driver/web`
- `@expense-tracker/db-offline/driver/mobile`
- `@expense-tracker/db-offline/driver/desktop`

Do not re-export a concrete platform driver from a shared application module.
Doing so can cause web bundlers to load React Native or Tauri native packages.

The web driver uses PowerSync's WASQLite storage. The mobile driver uses the
React Native PowerSync SDK. The desktop driver uses the Tauri plugin; its sync
connection must be started by Rust through a Tauri command.

## Upload contract

`OfflineBackendConnector` reads complete local CRUD transactions and passes them
to the configured upload callback. The backend must apply all operations in one
database transaction. The local queue is completed only after the callback
resolves successfully; thrown errors remain queued for retry.

Unique constraints can reject writes created concurrently on two offline
devices. The upload endpoint must distinguish permanent uniqueness conflicts
from retryable failures. The UI recovery flow must show the rejected record and
let the user rename or merge it; services must not use check-then-insert.

Permanent conflicts are persisted idempotently using the CRUD transaction,
entity, record, and operation identity. Web and mobile use
`onConflictDoNothing`; desktop uses `INSERT OR IGNORE`. After persistence, the
PowerSync transaction is completed so a permanent failure cannot retry forever.
Retryable transport and server failures remain queued.

Credential providers must return a PowerSync endpoint and short-lived token.
Returning `null` indicates that no user is signed in.

## Profile bootstrap

`User` is server-created. Platform runtimes must not seed an authenticated
session into the synchronized `User` table because that produces a PowerSync
`PUT User` operation which the authoritative API rejects. Until the
`my_profile` stream downloads the row, platform code uses the authenticated
session as its bootstrap identity. Harmless profile changes remain explicit
`PATCH` operations; email changes and account deletion use server commands.
The profile download stream includes `timezone`, and local transaction/report
date boundaries are produced by the shared client-core financial-time utility.

Attachment rows synchronize metadata only. Binary files use the API's
presigned object-storage lifecycle. An offline client retains its preassigned
attachment UUID, requests an upload URL with that UUID when online, uploads the
bytes, and completes verification without recreating the transaction.
Attachment rows are download-only through PowerSync; creation and deletion use
the authoritative attachment API so `storageKey` cannot be replaced locally.

## Service-layer boundary

UI code should call `packages/services` rather than placing business rules in
components or repositories. The offline repositories implement persistence
ports for those services. Each platform still creates its own PowerSync driver,
but Account and Transaction behavior remains shared.

## Drizzle migrations and PowerSync

PowerSync creates and maintains its managed SQLite views from
`powerSyncSchema`, so those views do not require client migrations. The Drizzle
migration is useful for local-only tests or tools that open the schema without
PowerSync.

Envelope budgeting adds `EnvelopeAllocation` and `BudgetTransfer`. They mirror
PostgreSQL source rows and synchronize independently. Available envelope
balances are recalculated locally rather than synchronized as mutable totals.

Transaction tombstones are server-controlled. Restore calls the authoritative
`POST /api/transactions/:id/restore` endpoint and waits for PowerSync to
download the restored row; clients do not upload `deletedAt: null`.
