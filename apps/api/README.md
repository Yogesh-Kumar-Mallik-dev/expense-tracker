# Next.js API

Server-only REST and PowerSync backend for the expense tracker.

## Development

Copy `.env.example` to `.env`, configure PostgreSQL and PowerSync, then run:

```sh
pnpm --filter @expense-tracker/api dev
```

All protected routes require `Authorization: Bearer <accessToken>`. Responses
use `{ "data": ... }` on success and `{ "error": { "code", "message",
"fields"? } }` on failure.

Domain handlers call `@expense-tracker/services` using adapters from
`@expense-tracker/db-main/adapters/services`. They never import the offline
database package.

PowerSync clients use:

- `GET /api/powersync/credentials`
- `POST /api/powersync/upload`

The upload route validates an allowlisted operation envelope and commits each
client CRUD transaction atomically. Synced deletes create tombstones.
