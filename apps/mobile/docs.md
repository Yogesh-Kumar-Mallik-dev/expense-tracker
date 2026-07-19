# Mobile Application Architecture

Status: Expo SDK 57 mobile composition implemented.

The mobile client initializes
`@expense-tracker/db-offline/driver/mobile`, construct domain services with the
offline adapters, and synchronize through the backend after authentication.
Refresh credentials and per-user device identifiers live in Expo SecureStore;
access credentials remain in memory. The email index selects only the previous
user ID; the device key itself is `expense-tracker.device-id.<userId>` and is
verified against the authenticated device list.

Fresh databases use the authenticated session as bootstrap identity and do not
insert a synchronized `User` row. PowerSync downloads the authoritative profile,
avoiding a permanently retrying `PUT User` upload on first login.

The native SQLite dependency requires an Expo development or native build;
Expo Go is not supported. Secure tokens belong in platform credential storage,
not synchronized SQLite tables.

Expo SDK 57 supports pnpm isolated installs. The workspace uses root overrides
for React, React DOM, and React Native so native packages receive one physical
peer version. Do not add manual `watchFolders`, `nodeModulesPaths`, or
`disableHierarchicalLookup` settings: modern Expo configures monorepos
automatically, and those legacy settings can break isolated installs.
