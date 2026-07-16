# Offline Database Usage Guide

## Initialize one platform database

Create exactly one database instance for a filename during application startup.

### Web

```ts
import { setOfflineClient } from "@expense-tracker/db-offline";
import { createWebDatabase } from "@expense-tracker/db-offline/driver/web";

export const offline = setOfflineClient(
  createWebDatabase({ filename: "expense-tracker.db" }),
);
```

Copy the PowerSync web worker and WASM assets into the web application's public
directory during setup or build.

### Expo / React Native

```ts
import { setOfflineClient } from "@expense-tracker/db-offline";
import { createMobileDatabase } from "@expense-tracker/db-offline/driver/mobile";

export const offline = setOfflineClient(createMobileDatabase());
```

Use an Expo development build or native build. The native SQLite module is not
available in the standard Expo Go client.

### Tauri

```ts
import { invoke } from "@tauri-apps/api/core";
import { appDataDir } from "@tauri-apps/api/path";
import { setOfflineClient } from "@expense-tracker/db-offline";
import {
  connectDesktopDatabase,
  createDesktopDatabase,
} from "@expense-tracker/db-offline/driver/desktop";

const client = setOfflineClient(
  createDesktopDatabase({ location: appDataDir }),
);

await connectDesktopDatabase(client.powerSync, invoke);
```

The Tauri application must register `tauri-plugin-powersync`, grant its
capability, and implement the `connect_powersync` Rust command.

## Connect web or mobile synchronization

```ts
import {
  connectSync,
  createHttpCredentialsProvider,
  OfflineBackendConnector,
} from "@expense-tracker/db-offline";

const connector = new OfflineBackendConnector({
  credentials: createHttpCredentialsProvider({
    endpoint: "/api/powersync/credentials",
    getAccessToken: async () => auth.accessToken,
  }),
  upload: async ({ operations }) => {
    const response = await fetch("/api/powersync/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operations }),
    });

    if (!response.ok) throw new Error("PowerSync upload failed");
  },
});

await connectSync(offline.powerSync, connector);
```

Disconnect on sign-out and close the client when the application permanently
tears down:

```ts
import { closeOfflineClient, disconnectSync } from "@expense-tracker/db-offline";

await disconnectSync(offline.powerSync);
await closeOfflineClient();
```

## Query through repositories

```ts
import {
  AccountRepository,
  TransactionRepository,
} from "@expense-tracker/db-offline";

const accounts = new AccountRepository(offline.db);
const transactions = new TransactionRepository(offline.db);

const activeAccounts = await accounts.listByUser(userId);
const recentTransactions = await transactions.listByUser(userId, {
  from: "2026-07-01T00:00:00.000Z",
  to: "2026-07-31T23:59:59.999Z",
  limit: 50,
});
```

Create IDs with the platform application's UUID utility before inserting offline
records so the same UUID can be uploaded to PostgreSQL. For example, in a web
runtime:

```ts
await accounts.create({
  id: crypto.randomUUID(),
  userId,
  name: "Cash",
  type: "CASH",
  currency: "USD",
  openingBalance: "0.0000",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
```

## Schema changes

After updating a Drizzle table, run:

```sh
pnpm --filter @expense-tracker/db-offline drizzle:generate
pnpm --filter @expense-tracker/db-offline check-types
pnpm build
```

Keep the matching Prisma model and PowerSync stream configuration synchronized
with every offline-visible schema change.
