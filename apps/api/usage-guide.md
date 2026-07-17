# API Usage Guide

For architecture and security decisions, see [docs.md](./docs.md).

## Configure and run

Create the local environment file:

```sh
cp apps/api/.env.example apps/api/.env
```

Set a reachable PostgreSQL URL and replace every example secret. Apply the
existing Prisma migration, then start the API:

```sh
pnpm --filter @expense-tracker/db-main exec prisma migrate deploy
pnpm --filter @expense-tracker/api dev
```

Validate a change with:

```sh
pnpm --filter @expense-tracker/api check-types
pnpm --filter @expense-tracker/api test
pnpm --filter @expense-tracker/api build
```

The examples below assume:

```sh
API=http://localhost:3000
```

## Health

```sh
curl "$API/api/health"
```

The endpoint checks that PostgreSQL can answer a trivial query.

## Register

```sh
curl -X POST "$API/api/auth/register" \
  -H "content-type: application/json" \
  -d '{
    "email": "person@example.com",
    "password": "a-long-unique-passphrase",
    "name": "Example Person",
    "currency": "USD"
  }'
```

The response contains the public user and `accessToken`, `refreshToken`, and
`expiresIn` fields beneath `data.tokens`.

## Login and token lifecycle

```sh
curl -X POST "$API/api/auth/login" \
  -H "content-type: application/json" \
  -d '{
    "email": "person@example.com",
    "password": "a-long-unique-passphrase"
  }'
```

Save the returned tokens in the client application's secure credential store:

```sh
ACCESS_TOKEN="<returned access token>"
REFRESH_TOKEN="<returned refresh token>"
```

Rotate an expired access-token pair:

```sh
curl -X POST "$API/api/auth/refresh" \
  -H "content-type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"
```

Replace both locally stored tokens after every successful refresh. The old
refresh token is revoked.

Logout:

```sh
curl -X POST "$API/api/auth/logout" \
  -H "authorization: Bearer $ACCESS_TOKEN" \
  -H "content-type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"
```

## Accounts

Create:

```sh
curl -X POST "$API/api/accounts" \
  -H "authorization: Bearer $ACCESS_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "name": "Everyday",
    "type": "CHECKING",
    "currency": "USD",
    "openingBalance": "0.0000"
  }'
```

List active accounts:

```sh
curl -H "authorization: Bearer $ACCESS_TOKEN" \
  "$API/api/accounts?page=1&pageSize=25"
```

The result includes:

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

Include archived accounts:

```sh
curl -H "authorization: Bearer $ACCESS_TOKEN" \
  "$API/api/accounts?includeArchived=true"
```

Update or tombstone:

```sh
curl -X PATCH "$API/api/accounts/$ACCOUNT_ID" \
  -H "authorization: Bearer $ACCESS_TOKEN" \
  -H "content-type: application/json" \
  -d '{"name":"Daily spending"}'

curl -X DELETE "$API/api/accounts/$ACCOUNT_ID" \
  -H "authorization: Bearer $ACCESS_TOKEN"
```

Categories, tags, budgets, transactions, attachments, and devices follow the
same collection and `/:id` patterns.

## Budgets

Budget lists require an inclusive date period:

```sh
curl -H "authorization: Bearer $ACCESS_TOKEN" \
  "$API/api/budgets?from=2026-07-01&to=2026-07-31"
```

Create a budget:

```sh
curl -X POST "$API/api/budgets" \
  -H "authorization: Bearer $ACCESS_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "name": "Monthly groceries",
    "amount": "500.0000",
    "currency": "USD",
    "startsOn": "2026-07-01",
    "endsOn": "2026-07-31"
  }'
```

Assign a category:

```sh
curl -X POST "$API/api/budgets/$BUDGET_ID/categories" \
  -H "authorization: Bearer $ACCESS_TOKEN" \
  -H "content-type: application/json" \
  -d "{\"categoryId\":\"$CATEGORY_ID\"}"
```

Use `GET` on the same URL to list assignments and `DELETE` with the same body
to tombstone one.

## Transactions

```sh
curl -X POST "$API/api/transactions" \
  -H "authorization: Bearer $ACCESS_TOKEN" \
  -H "content-type: application/json" \
  -d "{
    \"accountId\":\"$ACCOUNT_ID\",
    \"transferAccountId\":null,
    \"categoryId\":\"$CATEGORY_ID\",
    \"type\":\"EXPENSE\",
    \"amount\":\"24.5000\",
    \"currency\":\"USD\",
    \"description\":\"Groceries\",
    \"note\":null,
    \"occurredAt\":\"2026-07-17T10:00:00.000Z\"
  }"
```

Filter the list:

```sh
curl -H "authorization: Bearer $ACCESS_TOKEN" \
  "$API/api/transactions?accountId=$ACCOUNT_ID&from=2026-07-01T00%3A00%3A00.000Z&to=2026-07-31T23%3A59%3A59.999Z&page=1&pageSize=50"
```

Assign a tag independently:

```sh
curl -X POST "$API/api/transactions/$TRANSACTION_ID/tags" \
  -H "authorization: Bearer $ACCESS_TOKEN" \
  -H "content-type: application/json" \
  -d "{\"tagId\":\"$TAG_ID\"}"
```

Do not combine transaction, attachment, and tag creation into one assumed
sync-atomic operation. Retain the completed transaction ID and retry only the
pending metadata operation.

## Attachments

Attachment endpoints store metadata, not binary data:

```sh
curl -X POST "$API/api/attachments" \
  -H "authorization: Bearer $ACCESS_TOKEN" \
  -H "content-type: application/json" \
  -d "{
    \"transactionId\":\"$TRANSACTION_ID\",
    \"fileName\":\"receipt.jpg\",
    \"storageKey\":\"users/example/receipt.jpg\",
    \"mimeType\":\"image/jpeg\",
    \"sizeBytes\":204800
  }"
```

List metadata for one transaction:

```sh
curl -H "authorization: Bearer $ACCESS_TOKEN" \
  "$API/api/attachments?transactionId=$TRANSACTION_ID"
```

## Reporting

```sh
curl -H "authorization: Bearer $ACCESS_TOKEN" \
  "$API/api/reporting/account-balances"

curl -H "authorization: Bearer $ACCESS_TOKEN" \
  "$API/api/reporting/budget-usage?from=2026-07-01&to=2026-07-31"
```

Read `excludedTransactionIds` before displaying totals. It identifies
transactions whose currency could not be combined with the target account or
budget.

## PowerSync client integration

Credentials:

```sh
curl -H "authorization: Bearer $ACCESS_TOKEN" \
  "$API/api/powersync/credentials"
```

The offline connector sends each complete local CRUD transaction:

```sh
curl -X POST "$API/api/powersync/upload" \
  -H "authorization: Bearer $ACCESS_TOKEN" \
  -H "content-type: application/json" \
  -d "{
    \"operations\":[{
      \"op\":\"PATCH\",
      \"table\":\"Account\",
      \"id\":\"$ACCOUNT_ID\",
      \"data\":{\"name\":\"Daily spending\",\"updatedAt\":\"2026-07-17T12:00:00.000Z\"}
    }]
  }"
```

Only complete the local PowerSync transaction after a successful HTTP response.
Retry network and server failures. Treat `409` uniqueness conflicts as permanent
until the user chooses a rename or merge recovery.

## Rate-limit responses

Inspect rate-limit metadata on any response:

```sh
curl -i -H "authorization: Bearer $ACCESS_TOKEN" \
  "$API/api/accounts"
```

Typical headers are:

```http
RateLimit-Limit: 120
RateLimit-Remaining: 119
RateLimit-Reset: 1784275260
```

On `429 Too Many Requests`, wait for the number of seconds in `Retry-After`
before sending another request. Clients should avoid parallel automatic retries
that all wake at the same instant; add a small randomized delay.
