# Desktop Application

Initialized Tauri v2 desktop client with a React and Vite frontend.

The Rust core registers `tauri-plugin-powersync`, the default capability grants
the plugin's minimum standard permission, and the Vite frontend has a local
`@/*` alias. Release bundling remains disabled until signing, packaging, and
product artwork decisions are made.

Run `pnpm --filter @expense-tracker/desktop tauri:dev` for the native app or
`pnpm --filter @expense-tracker/desktop dev` for browser-only UI development.

See [docs.md](./docs.md) and [usage-guide.md](./usage-guide.md).
