# Desktop Application Usage Guide

Status: not yet implemented.

Implementation prerequisites:

1. Scaffold the Tauri and React workspace application.
2. Register `tauri-plugin-powersync`.
3. Grant the minimum required Tauri capability.
4. Implement the `connect_powersync` Rust command.
5. Create one desktop offline database in the application data directory.
6. Construct offline service adapters and connect after login.
7. Package-test database persistence and reconnect behavior.

See `packages/db-offline/usage-guide.md` for the current driver calls.
