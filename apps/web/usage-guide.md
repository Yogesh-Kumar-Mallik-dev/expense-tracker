# Web Application Usage Guide

Status: not yet implemented.

Before adding features:

1. Scaffold the Next.js workspace package.
2. Copy PowerSync WASM and worker assets into the public directory.
3. Initialize one web offline database instance.
4. Construct shared services with offline adapters.
5. Implement login and token refresh against `@expense-tracker/api`.
6. Connect PowerSync only after authentication.
7. Disconnect and close the database during permanent teardown.

Refer to `packages/db-offline/usage-guide.md` for the web driver example and
`apps/api/usage-guide.md` for backend requests.
