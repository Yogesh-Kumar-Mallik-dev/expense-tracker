# Offline Database

`@expense-tracker/db-offline` provides the SQLite database used by the web,
Expo/React Native, and Tauri applications. Drizzle supplies typed queries while
PowerSync manages local-first synchronization with PostgreSQL.

## Structure

```text
packages/db-offline
├── drizzle                     # Generated SQLite migration
├── src
│   ├── driver                  # Web, mobile, and desktop factories
│   ├── powersync               # Connector and sync lifecycle
│   ├── repositories            # Drizzle data access
│   ├── schema                  # SQLite schema
│   ├── database.ts             # Drizzle/PowerSync bridge
│   └── index.ts                # Platform-neutral exports
└── drizzle.config.ts
```

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
- `RefreshToken` is marked as a PowerSync local-only table.

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

Credential providers must return a PowerSync endpoint and short-lived token.
Returning `null` indicates that no user is signed in.

## Drizzle migrations and PowerSync

PowerSync creates and maintains its managed SQLite views from
`powerSyncSchema`, so those views do not require client migrations. The Drizzle
migration is useful for local-only tests or tools that open the schema without
PowerSync.
