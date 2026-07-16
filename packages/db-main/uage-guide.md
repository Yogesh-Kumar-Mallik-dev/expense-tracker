# Main Database Usage Guide

## Build and generate

Run commands through pnpm from the monorepo root:

```sh
pnpm --filter @expense-tracker/db-main generate
pnpm --filter @expense-tracker/db-main build
pnpm --filter @expense-tracker/db-main check-types
```

The root workflows also include this package:

```sh
pnpm build
pnpm check-types
```

## Import the client

Workspace code can use the configured source alias:

```ts
import { prisma } from "@db-main";

const user = await prisma.user.findUnique({
  where: { email: "person@example.com" },
});
```

Published workspace-package consumers can use its package name:

```ts
import { prisma } from "@expense-tracker/db-main";
```

The client uses `@prisma/adapter-pg` and reuses one development instance to
avoid creating extra pools during hot reload.

## Use repositories

```ts
import {
  AccountRepository,
  TransactionRepository,
} from "@db-main";

const accounts = new AccountRepository();
const transactions = new TransactionRepository();

const activeAccounts = await accounts.listByUser(userId);

const recent = await transactions.listByUser(userId, {
  accountId,
  from: new Date("2026-07-01T00:00:00.000Z"),
  to: new Date("2026-07-31T23:59:59.999Z"),
  take: 50,
});
```

Repositories accept an optional `PrismaClient` in their constructors, which is
useful for tests or applications that manage their own client instance. Use
`prisma.$transaction` directly when multiple repository-style writes must commit
atomically.

## Create records

Unchecked repository inputs accept foreign-key IDs directly:

```ts
await accounts.create({
  userId,
  name: "Everyday",
  type: "CHECKING",
  currency: "USD",
  openingBalance: "0.0000",
});
```

Database-generated UUIDs and timestamps are used when their input fields are
omitted.

## Migrations

After changing a model, format and validate before creating a migration:

```sh
pnpm --filter @expense-tracker/db-main exec prisma format
pnpm --filter @expense-tracker/db-main exec prisma validate
pnpm --filter @expense-tracker/db-main exec prisma migrate dev --name describe_change
```

Any server schema change that is available offline must also be reflected in
`packages/db-offline/src/schema` and in the PowerSync stream configuration.
