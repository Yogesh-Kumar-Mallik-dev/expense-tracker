# Mobile Application Architecture

Status: planned.

The mobile client will initialize
`@expense-tracker/db-offline/driver/mobile`, construct domain services with the
offline adapters, and synchronize through the backend after authentication.

The native SQLite dependency requires an Expo development or native build;
Expo Go is not supported. Secure tokens belong in platform credential storage,
not synchronized SQLite tables.
