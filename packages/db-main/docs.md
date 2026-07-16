# Main Database

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

Join deletion methods use ownership-constrained `deleteMany` calls. They return
`{ count: number }`, where zero means the relation was absent or not owned by the
provided user.

## Prisma configuration

Prisma loads the entire `prisma/` directory through `prisma.config.ts`. The
database connection URL is read from `DATABASE_URL` in Prisma config, as required
by Prisma 7.

Both build and type-check scripts generate Prisma Client first. This allows a
clean clone to build without a committed generated client.

## Environment

```env
DATABASE_URL=postgresql://user:password@localhost:5432/expense_tracker
```

Never expose this package or its environment variables to browser or native
client bundles.
