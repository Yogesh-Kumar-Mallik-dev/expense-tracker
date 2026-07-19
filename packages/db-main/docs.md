# Main Database

See [usage-guide.md](./usage-guide.md) for commands and integration examples.

`@expense-tracker/db-main` is the backend-only PostgreSQL package. It owns the
authoritative application schema, generates Prisma Client 7, and exposes
user-scoped repositories for API and service-layer code.

## Structure

```text
packages/db-main
├── prisma
│   ├── models                 # Split Prisma models
│   └── schema.prisma          # Generator and PostgreSQL datasource
├── src
│   ├── generated/prisma       # Generated; not committed
│   ├── repositories           # Database access by domain
│   ├── client.ts              # PrismaPg client singleton
│   └── index.ts               # Public package exports
├── index.ts                   # Source-level workspace entry
└── prisma.config.ts
```

## Data model

The schema contains these models:

- `User`
- `Account`
- `Category`
- `Budget`
- `BudgetCategory`
- `Transaction`
- `Tag`
- `TransactionTag`
- `Attachment`
- `Device`
- `RefreshToken`
- `SyncState`

`BudgetCategory` and `TransactionTag` are explicit join models. They have UUID
primary keys so individual relationship changes can be synchronized reliably.

Money uses PostgreSQL `Decimal(19, 4)`. Application code should pass a Prisma
Decimal-compatible string or value and must not convert monetary values through
JavaScript floating-point arithmetic.

## Ownership

Most records belong to a user. Repository reads, updates, and deletes accept a
`userId` so API handlers can constrain operations to the authenticated owner.
Authentication and authorization still belong in the service or route layer;
repositories do not determine the current user.

Refresh-token device ownership is additionally enforced by a composite foreign
key from `(deviceId, userId)` to `Device(id, userId)`. The migration clears any
legacy mismatched association before enabling the constraint.

All synced models use nullable `deletedAt` tombstones. Repository delete methods
perform idempotent updates; no affected row means the record was already
deleted, absent, or not owned by the provided user. Normal reads exclude
tombstoned rows. Required foreign keys use restrictive deletes so an accidental
physical parent delete cannot cascade through synchronized data.

The database still enforces unique names and relationship pairs. Concurrent
offline inserts can therefore be rejected during upload. The upload API must
report this as a permanent sync conflict, and the UI must let the user rename or
merge the conflicting record. Services must never use check-then-insert as a
substitute for these constraints.

## Prisma configuration

Prisma loads the entire `prisma/` directory through `prisma.config.ts`. The
database connection URL is read from `DATABASE_URL` in Prisma config, as required
by Prisma 7.

Both build and type-check scripts generate Prisma Client first. This allows a
clean clone to build without a committed generated client.

## Service-layer boundary

Business rules belong in `packages/services`, not in repositories. Backend route
handlers inject `db-main` repository implementations into the same service ports
used by offline clients. Repositories remain responsible only for persistence,
ownership filters, tombstones, and domain-oriented queries.

## Environment

The database connection inventory and repository-local default live in
[`secrets/`](../../secrets/README.md). This package's development command loads
`secrets/env.development.database`; deployments inject `DATABASE_URL` from
their secret manager.

Never expose this package or its environment variables to browser or native
client bundles.

## Budget modes

`Budget.mode` defaults to `SPENDING_LIMIT`. Envelope plans use
`EnvelopeAllocation` and `BudgetTransfer` as source records. PostgreSQL does
not store mutable available or remaining counters; reporting derives them.
