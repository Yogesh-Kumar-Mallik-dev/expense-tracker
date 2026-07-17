# Mobile Application Usage Guide

Status: framework initialized.

Implementation prerequisites:

1. Run `pnpm --filter @expense-tracker/mobile doctor`.
2. Create the native development build with
   `pnpm --filter @expense-tracker/mobile android` or `ios`.
3. Start Metro with `pnpm --filter @expense-tracker/mobile dev`.
4. Create one mobile offline database during application startup.
5. Store access and refresh tokens in secure platform storage.
6. Construct shared services with offline adapters.
7. Connect synchronization after login and disconnect during sign-out.
8. Test offline creation, reconnect, and permanent-conflict recovery.

See `packages/db-offline/usage-guide.md` for mobile initialization.
