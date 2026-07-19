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
