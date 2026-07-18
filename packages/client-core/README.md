# Client Core

`@expense-tracker/client-core` is the platform-neutral composition boundary
between the shared UI and application infrastructure. It owns transport
contracts, runtime response validation, session refresh orchestration, and
per-user local-database identities. It does not import React, Next.js, Tauri,
Expo, or a concrete SQLite driver.

Platform hosts construct an `ExpenseApplication` and inject it into `ui-web`
or `ui-native`. Web uses the session BFF and an HttpOnly refresh cookie.
Desktop uses the operating-system credential vault. Access tokens stay in
memory on both platforms.

PowerSync and concrete offline repositories remain disconnected until the
Phase 3 platform composition work.
