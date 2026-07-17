# Desktop Application Usage Guide

Status: framework and native plugin initialized.

Implementation prerequisites:

1. Run `pnpm --filter @expense-tracker/desktop tauri:dev`.
2. Implement the authenticated Rust connector and `connect_powersync` command.
3. Create one desktop offline database in the application data directory.
4. Construct offline service adapters and connect after login.
5. Enable release bundling after signing and platform packaging are configured.
6. Package-test database persistence and reconnect behavior.

See `packages/db-offline/usage-guide.md` for the current driver calls.
