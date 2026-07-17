# Main Database

`@expense-tracker/db-main` is the server-only Prisma 7 and PostgreSQL package.
It owns the authoritative schema, repositories, and shared-service adapters.

See [docs.md](./docs.md) for data and ownership contracts and
[usage-guide.md](./usage-guide.md) for generation, migration, and query
examples.

```sh
pnpm --filter @expense-tracker/db-main generate
pnpm --filter @expense-tracker/db-main check-types
pnpm --filter @expense-tracker/db-main build
```
