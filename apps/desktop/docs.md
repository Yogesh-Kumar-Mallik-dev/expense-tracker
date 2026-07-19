# Desktop Application Architecture

Status: Tauri v2, React, Vite, per-user native SQLite, OS-vault credentials,
and the Rust PowerSync connector initialized.

The desktop client uses Tauri with a React UI and the isolated
`@expense-tracker/db-offline/driver/desktop` entry point. TypeScript constructs
the Drizzle/PowerSync bridge, while Rust registers `tauri-plugin-powersync` and
starts synchronization through a permitted Tauri command.

Business behavior remains in `@expense-tracker/services`. Native capabilities,
filesystem access, and PowerSync startup remain in desktop-specific bootstrap
code.

The TypeScript bootstrap passes the database handle and memory-only access
token to `connect_powersync`. Rust fetches PowerSync credentials, uploads
complete CRUD transactions, and receives rotated access tokens without
persisting them.

The session profile is not copied into the synchronized `User` table during
database initialization. The authoritative row is downloaded by PowerSync, so
opening a new per-user database cannot enqueue a rejected `PUT User` operation.
