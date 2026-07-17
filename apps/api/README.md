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
cp apps/api/.env.example apps/api/.env
pnpm install
pnpm --filter @expense-tracker/db-main generate
pnpm --filter @expense-tracker/api dev
```

The API is served at `http://localhost:3000` by default. A working PostgreSQL
database and valid secrets are required.

## Commands

```sh
pnpm --filter @expense-tracker/api dev
pnpm --filter @expense-tracker/api check-types
pnpm --filter @expense-tracker/api test
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

## Route groups

| Group          | Routes                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------ |
| Health         | `/api/health`                                                                                    |
| Authentication | `/api/auth/register`, `/login`, `/refresh`, `/logout`                                            |
| Profile        | `/api/users/me`                                                                                  |
| Domains        | `/api/accounts`, `/categories`, `/tags`, `/budgets`, `/transactions`, `/attachments`, `/devices` |
| Assignments    | `/api/budgets/:id/categories`, `/api/transactions/:id/tags`                                      |
| Reporting      | `/api/reporting/account-balances`, `/api/reporting/budget-usage`                                 |
| PowerSync      | `/api/powersync/credentials`, `/api/powersync/upload`                                            |
