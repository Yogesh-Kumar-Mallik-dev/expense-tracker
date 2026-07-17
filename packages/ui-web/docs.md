# Web UI Architecture

`@expense-tracker/ui-web` owns DOM-based React primitives shared by the Next.js
web and Tauri desktop applications. Components live exclusively in `ui-src/`.

The package must not import Next.js, Tauri APIs, application bootstrap code, or
React Native. Consumers compose these primitives with platform behavior.

The frontend uses copy-owned ReUI-style `Frame`, `Badge`, and `Button`
primitives. `ExpenseApi` maps shared service record types to the REST envelope,
pagination, request correlation, and rate-limit metadata.
