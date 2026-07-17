# Mobile Application Architecture

Status: Expo SDK 57, development client, and NativeWind initialized.

The mobile client will initialize
`@expense-tracker/db-offline/driver/mobile`, construct domain services with the
offline adapters, and synchronize through the backend after authentication.

The native SQLite dependency requires an Expo development or native build;
Expo Go is not supported. Secure tokens belong in platform credential storage,
not synchronized SQLite tables.

Expo SDK 57 supports pnpm isolated installs. The workspace uses root overrides
for React, React DOM, and React Native so native packages receive one physical
peer version. Do not add manual `watchFolders`, `nodeModulesPaths`, or
`disableHierarchicalLookup` settings: modern Expo configures monorepos
automatically, and those legacy settings can break isolated installs.
