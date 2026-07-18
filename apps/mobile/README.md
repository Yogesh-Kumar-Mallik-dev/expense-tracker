# Mobile Application

Expo SDK 57 application with React Native, NativeWind, SecureStore,
client-core, per-user native SQLite, and PowerSync.

The root pnpm workspace pins React and React Native to one peer context so
PowerSync and Expo do not produce duplicate native modules under pnpm's
isolated linker. Metro uses Expo's monorepo-aware defaults and only adds the
NativeWind transformer. Expo Doctor passes all checks.

Expo Go is not supported because the offline PowerSync driver contains native
code. Use `pnpm --filter @expense-tracker/mobile android` or the equivalent iOS
development build, then run `pnpm --filter @expense-tracker/mobile dev`.

The app restores rotated refresh credentials from SecureStore, registers the
device, opens the user database, connects PowerSync, and renders transactions
from local services.

See [docs.md](./docs.md) and [usage-guide.md](./usage-guide.md).
