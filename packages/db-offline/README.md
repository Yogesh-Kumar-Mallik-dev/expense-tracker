# `@expense-tracker/db-offline`

Shared offline SQLite database for the web, Expo/React Native, and Tauri apps. The
Drizzle schema mirrors the user-owned models in `db-main` and is converted into a
PowerSync client schema at runtime.

## Platform setup

Each application must import only its own driver entry point:

```ts
// Next.js client component
import { createWebDatabase } from "@expense-tracker/db-offline/driver/web";

// Expo / React Native
import { createMobileDatabase } from "@expense-tracker/db-offline/driver/mobile";

// Tauri
import {
  connectDesktopDatabase,
  createDesktopDatabase,
} from "@expense-tracker/db-offline/driver/desktop";
```

Initialize the shared client once during application startup:

```ts
import { setOfflineClient } from "@expense-tracker/db-offline";
import { createWebDatabase } from "@expense-tracker/db-offline/driver/web";

const client = setOfflineClient(createWebDatabase());
```

The web app must copy the `@powersync/web` worker and WASM assets into its public
directory as part of its build. Expo requires a development build because the
native PowerSync SQLite module is not available in Expo Go.

The Tauri PowerSync SDK currently runs synchronization in Rust. Register the
`tauri-plugin-powersync` crate and a `connect_powersync` command, then pass Tauri's
`invoke` function to `connectDesktopDatabase`. The JavaScript package configures
the same SQLite schema and Drizzle repositories used by the other platforms.

## Synchronization

Web and mobile use the shared connector:

```ts
import {
  connectSync,
  createHttpCredentialsProvider,
  OfflineBackendConnector,
} from "@expense-tracker/db-offline";

const connector = new OfflineBackendConnector({
  credentials: createHttpCredentialsProvider({
    endpoint: "/api/powersync/credentials",
    getAccessToken: async () => session.accessToken,
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

await connectSync(client.powerSync, connector);
```

The backend must apply every uploaded transaction atomically before returning a
successful response. The connector only completes the local CRUD transaction
after the upload callback succeeds.

## Data representation

- UUIDs and timestamps are stored as SQLite text. Timestamps should use ISO 8601.
- Decimal money values are stored as text to avoid floating-point precision loss.
- Booleans are stored as SQLite integers through Drizzle's boolean mapping.
- `User.passwordHash` is deliberately excluded from offline storage and must not
  be included in PowerSync streams.
- `RefreshToken` is a local-only PowerSync table and is never streamed or
  uploaded.

PowerSync creates its managed SQLite views from `powerSyncSchema`; client-side
migrations are not required for those views. The generated Drizzle migration is
provided for local-only or test databases that use the same schema without
PowerSync.
