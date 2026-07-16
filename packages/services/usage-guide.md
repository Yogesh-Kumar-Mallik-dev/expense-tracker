# Shared Services Usage Guide

For architectural and concurrency constraints, see [docs.md](./docs.md).

## Build

```sh
pnpm --filter @expense-tracker/services check-types
pnpm --filter @expense-tracker/services build
pnpm build
```

## Account service

Construct the service with a repository-port implementation. Inject a UUID
factory on platforms that do not provide `globalThis.crypto.randomUUID`.

```ts
import { AccountService } from "@expense-tracker/services/account";

const accounts = new AccountService(accountRepository, createPlatformUuid);

const account = await accounts.create({
  userId,
  name: "Everyday",
  type: "CHECKING",
  currency: "USD",
  openingBalance: "0.0000",
});

await accounts.update(account.id, userId, { name: "Daily spending" });
await accounts.delete(account.id, userId); // Writes deletedAt.
```

Do not add an `adjustBalance` function. Current balance must be derived from the
opening balance and non-tombstoned transaction rows.

## Transaction service

```ts
import { TransactionService } from "@expense-tracker/services/transaction";

const transactions = new TransactionService(
  transactionRepository,
  createPlatformUuid,
);

const transaction = await transactions.create({
  userId,
  accountId,
  transferAccountId: null,
  categoryId,
  type: "EXPENSE",
  amount: "24.5000",
  currency: "USD",
  description: "Groceries",
  note: null,
  occurredAt: new Date().toISOString(),
});
```

Create tag assignments and attachments separately. If one of those writes fails
or syncs later, the transaction remains valid and the UI should expose retry.

## Backend integration

Backend endpoints create services with adapters around `db-main` repositories.
The endpoint supplies the authenticated `userId`; services validate inputs and
repositories enforce ownership in their queries. Do not duplicate service rules
inside route handlers.

## Offline integration

Web, desktop, and mobile create services with adapters around `db-offline`
repositories. Foreign-key IDs are validated against locally available state when
needed and are never blocked because the parent has not reached PostgreSQL yet.

## Unique conflicts

Services do not check for an existing name before inserting. PostgreSQL may
reject two conflicting records created independently on different devices. The
PowerSync upload path must classify this as a permanent conflict, and the UI
must offer rename or merge recovery instead of retrying forever.
