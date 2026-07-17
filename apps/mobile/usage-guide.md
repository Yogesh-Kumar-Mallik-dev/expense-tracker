# Mobile Application Usage Guide

Status: not yet implemented.

Implementation prerequisites:

1. Scaffold the Expo workspace application.
2. Configure an Expo development build with native PowerSync modules.
3. Create one mobile offline database during application startup.
4. Store access and refresh tokens in secure platform storage.
5. Construct shared services with offline adapters.
6. Connect synchronization after login and disconnect during sign-out.
7. Test offline creation, reconnect, and permanent-conflict recovery.

See `packages/db-offline/usage-guide.md` for mobile initialization.
