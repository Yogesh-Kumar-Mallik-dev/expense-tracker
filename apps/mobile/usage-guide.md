# Mobile Application Usage Guide

Status: native local-first transaction register implemented.

Implementation prerequisites:

1. Run `pnpm --filter @expense-tracker/mobile doctor`.
2. Create the native development build with
   `pnpm --filter @expense-tracker/mobile android` or `ios`.
3. Start Metro with `pnpm --filter @expense-tracker/mobile dev`.
4. Set `EXPO_PUBLIC_API_URL` to the reachable API origin. A physical device
   cannot use the development machine's `localhost`.
5. Sign in. The app stores the rotating session in SecureStore, opens a
   per-user PowerSync database, and renders the transaction register from
   SQLite.
6. PowerSync connects after authentication when the API exposes credentials
   and disconnects during sign-out.
7. Use an Expo development build. The native SQLite driver is not supported by
   Expo Go.

Release profiles live in `eas.json`. Store signing credentials in EAS or the
platform stores; do not add them to this repository.

See `packages/db-offline/usage-guide.md` for mobile initialization.
