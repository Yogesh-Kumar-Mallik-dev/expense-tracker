# Web Application Architecture

Status: Next.js, per-user WASQLite, offline services, and PowerSync bootstrap
implemented.

The web client:

- use Next.js for the user interface;
- initialize only `@expense-tracker/db-offline/driver/web`;
- construct shared services with offline service adapters;
- use WASQLite for local persistence;
- connect PowerSync to the backend credentials and upload endpoints;
- store authentication tokens outside synchronized application tables.

Platform driver imports must remain in web bootstrap code so native mobile and
Tauri modules cannot enter the web bundle. UI components must not contain
business rules already owned by `@expense-tracker/services`.

Existing local records render without waiting for first synchronization.
Attachment bytes are retained in IndexedDB while retry metadata lives in the
local-only SQLite queue.

On a fresh database, the authenticated session is the bootstrap identity. The
runtime does not insert it into the synchronized `User` table; the authoritative
profile arrives through the `my_profile` stream. This prevents first login from
enqueuing a rejected `PUT User` operation.

Permanent conflicts are inserted idempotently into the local conflict store
before the corresponding CRUD transaction is completed. Retryable failures
remain queued.

`next.config.ts` transpiles the three local workspace libraries. The app-local
`@/*` alias resolves from `apps/web`; cross-package code must use the published
`@expense-tracker/*` names.
