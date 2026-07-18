# Web UI Architecture

`@expense-tracker/ui-web` owns the DOM product interface shared by the Next.js
web and Tauri desktop applications. Components live exclusively in `ui-src/`.

The package must not import Next.js, Tauri APIs, application bootstrap code, or
React Native. Consumers compose these primitives with platform behavior.

## Structure

- `src/screens/` contains route-level workflows and transaction forms.
- `src/shell.tsx` owns hash routing and responsive application navigation.
- `src/api.ts` re-exports client contracts. The validated REST adapter lives in
  `@expense-tracker/client-core` and is injected by each platform host.
- `src/money.ts` formats decimal strings with fixed-point operations and never
  converts domain money to JavaScript floating point.
- `components/ui/` contains official shadcn/ReUI registry components.
- `components/reui/` contains components installed from the ReUI registry.
- `styles.css` owns documented semantic tokens and responsive product layout.

## Product boundaries

The frontend only exposes backend capabilities verified in the API and service
packages. It does not infer synchronization state from loaded records, calculate
aggregate totals from a paginated response, or persist bearer tokens in browser
storage.

Current route screens are:

- Transactions: filterable, paginated register; create/edit/delete; tags; and
  attachment upload, download, and deletion with explicit partial failure.
- Accounts: create/edit/archive/restore plus reporting-service balances.
- Categories and tags: create/edit and archive/delete workflows.
- Budgets: create/edit/delete, category assignment, spending-limit usage,
  envelope allocation, and envelope transfers.
- Reports: an honest unavailable state pending reporting endpoints.
- Synchronization: live connection, transfer, last-sync, attachment-queue, and
  failure state from the platform runtime.
- Settings: profile defaults, registered devices, diagnostics, and sign-out.
- Overview: workflow shortcuts without invented metrics.

The unauthenticated screen supports both login and account registration through
the API authentication routes. Successful registration returns the same
validated session envelope as login and opens the application immediately.

## Remaining workflow dependencies

- Transaction deletion offers undo through an owned tombstone-restore command.
- Budget-mode conversion accepts confirmed values, checks the source version,
  copies assignments, and commits in one authoritative transaction.
- Attachment bytes and retry metadata survive restart in local-only storage.
- Email changes use a time-limited verification token. Production delivery
  requires `RESEND_API_KEY`, `EMAIL_FROM`, and `WEB_APP_URL`.

See `frontend-design.md` for research sources, accessibility requirements, and
missing service dependencies.
