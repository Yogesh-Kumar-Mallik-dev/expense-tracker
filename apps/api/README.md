# Next.js API

`@expense-tracker/api` is the server-only REST and PowerSync backend for the
expense tracker. It uses Next.js Route Handlers, authenticates callers, invokes
the shared service layer, and persists authoritative data through Prisma and
PostgreSQL.

See [docs.md](./docs.md) for architecture and security contracts and
[usage-guide.md](./usage-guide.md) for setup, commands, and request examples.

## Responsibilities

- Register users and issue short-lived access and rotating refresh tokens.
- Authenticate every protected request and derive its trusted `userId`.
- Expose account, category, tag, budget, transaction, attachment, device, and
  profile endpoints.
- Expose derived account-balance and budget-usage reports.
- Issue short-lived PowerSync credentials.
- Apply each uploaded PowerSync CRUD batch in one PostgreSQL transaction.
- Translate validation, ownership, and database errors into a stable HTTP
  response shape.

Business rules are not implemented in Route Handlers. Domain endpoints call
`@expense-tracker/services` through adapters exported by
`@expense-tracker/db-main/adapters/services`.

## Quick start

From the repository root:

```sh
pnpm install
pnpm dev:api
```

The command loads `secrets/env.development.database` and
`secrets/env.development.api`, provisions the local Prisma Postgres server,
applies migrations, and serves the API at `http://localhost:3001`.
Environment ownership and production configuration are documented in
[`secrets/README.md`](../../secrets/README.md).

## Commands

```sh
pnpm dev:api
pnpm --filter @expense-tracker/api check-types
pnpm test:api
pnpm --filter @expense-tracker/api build
```

## API conventions

Protected routes require:

```http
Authorization: Bearer <accessToken>
```

Successful JSON responses use:

```json
{ "data": {} }
```

Collection responses also include pagination metadata:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 0,
    "totalPages": 0,
    "hasNext": false,
    "hasPrevious": false
  }
}
```

Failures use:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "fields": ["amount"]
  }
}
```

Delete and update operations that do not return a representation respond with
`204 No Content`.

Collection endpoints accept `page` and `pageSize`; the default page size is 25
and the maximum is 100. The older `limit` name is accepted as an alias for
`pageSize`.

Every API response includes rate-limit headers. Exceeding a policy returns
`429 Too Many Requests` with `Retry-After`.

## Route groups

| Group           | Routes                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------ |
| Health          | `/api/health`                                                                                    |
| Authentication  | `/api/auth/register`, `/login`, `/refresh`, `/logout`, `/confirm-email`                          |
| Public keys     | `/api/auth/keys`                                                                                 |
| Profile         | `/api/users/me`, `/api/users/me/email-change`, `/api/users/me/deletion`                          |
| Backup          | `/api/users/me/backup`                                                                           |
| Restore staging | `/api/users/me/restore-datasets`, `/api/users/me/restore-datasets/:id`                           |
| Schedules       | `/api/schedules`, `/api/schedules/occurrences/:id`                                               |
| Reconciliation  | `/api/accounts/:id/reconcile`                                                                    |
| Net worth       | `/api/reporting/net-worth-history`                                                               |
| Domains         | `/api/accounts`, `/categories`, `/tags`, `/budgets`, `/transactions`, `/attachments`, `/devices` |
| Assignments     | `/api/budgets/:id/categories`, `/api/transactions/:id/tags`                                      |
| Reporting       | `/api/reporting/account-balances`, `/budget-usage`, `/period-spending`, `/category-spending`     |
| PowerSync       | `/api/powersync/credentials`, `/api/powersync/upload`                                            |
| Binary files    | `/api/attachments/upload`, `/complete`, `/:id/download`                                          |
| Telemetry       | `/api/telemetry` (optional server-side forwarding)                                               |
| Operations      | `/api/internal/retention` (scheduler secret required)                                            |
