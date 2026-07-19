# Environment architecture

Environment configuration is centralized here, but ownership remains local to
the runtime that consumes each variable.

| Runtime    | Owns                                                                       |
| ---------- | -------------------------------------------------------------------------- |
| `database` | Prisma/PostgreSQL connection                                                |
| `api`      | Authentication, CORS, PowerSync, attachments, email, logging and retention |
| `web`      | Server-side API origin and public telemetry endpoint                       |
| `desktop`  | Public API/telemetry origins, Tauri development host and signing manifest   |
| `mobile`   | Expo-public API origin                                                      |

Variables prefixed with `NEXT_PUBLIC_`, `VITE_`, or `EXPO_PUBLIC_` are compiled
into client applications and must never contain credentials. Server secrets
must remain in the API, database, CI, or deployment secret store.

The checked-in development credentials are intentionally local-only and must
not be reused outside the repository-local Prisma server. Production files are
inventories, not deployable secret values.

Tauri signing keys are intentionally omitted from file values. CI must inject
`TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` directly.
