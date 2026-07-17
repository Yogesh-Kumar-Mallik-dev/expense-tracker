# Desktop Application Architecture

Status: Tauri v2, React, Vite, and the PowerSync native plugin initialized.

The desktop client will use Tauri with a React UI and the isolated
`@expense-tracker/db-offline/driver/desktop` entry point. TypeScript constructs
the Drizzle/PowerSync bridge, while Rust registers `tauri-plugin-powersync` and
starts synchronization through a permitted Tauri command.

Business behavior remains in `@expense-tracker/services`. Native capabilities,
filesystem access, and PowerSync startup remain in desktop-specific bootstrap
code.

The current Rust shell registers the plugin but does not connect it. Connection
credentials and the `connect_powersync` command belong to the authentication
integration rather than framework initialization.
