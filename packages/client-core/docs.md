# Client Core Architecture

The package separates four concerns:

- `SessionController` restores, refreshes, and clears authentication.
- `ExpenseDataClient` provides validated financial-data operations to the UI.
- `SyncController` controls the platform synchronization lifecycle.
- `LocalDatabaseLifecycle` isolates local storage using a stable hash of the
  authenticated user ID.

Refresh calls are single-flight. A REST request receiving `401` performs one
refresh and one retry. A failed refresh disconnects synchronization, closes
the active database, clears credentials, and publishes an anonymous state.

The web BFF keeps refresh tokens out of browser JavaScript. Desktop delegates
refresh-token reads and writes to a Tauri command backed by the OS keyring.

Device identifiers are scoped by authenticated user rather than installation.
Login resolves the previous identifier through a normalized-email-to-user
index; after authentication, the client verifies that identifier against the
owned device list and replaces stale or foreign values.
Registration sends a constrained device name and platform, and the server
creates that device before issuing the first refresh token. The returned
`deviceId` is persisted immediately, so the first session is revocable from the
device list without requiring a later login.

Financial date filters are interpreted in the authenticated user's configured
IANA timezone. `financialDayRange` converts inclusive calendar dates to precise
UTC instants without using the browser or operating-system timezone and
preserves 23-hour and 25-hour daylight-saving days. REST and offline clients
share this conversion. Offline attachment deletion is intentionally remote:
the authoritative API tombstones the metadata and PowerSync downloads that
result without generating an unsupported local attachment operation.
