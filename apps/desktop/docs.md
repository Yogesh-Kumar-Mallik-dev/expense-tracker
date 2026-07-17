# Desktop Application Architecture

Status: planned.

The desktop client will use Tauri with a React UI and the isolated
`@expense-tracker/db-offline/driver/desktop` entry point. TypeScript constructs
the Drizzle/PowerSync bridge, while Rust registers `tauri-plugin-powersync` and
starts synchronization through a permitted Tauri command.

Business behavior remains in `@expense-tracker/services`. Native capabilities,
filesystem access, and PowerSync startup remain in desktop-specific bootstrap
code.
