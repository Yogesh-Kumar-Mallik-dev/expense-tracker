# Shared Services

`@expense-tracker/services` contains platform-neutral validation and business
logic for the backend and offline clients.

See [docs.md](./docs.md) for architecture and concurrency rules and
[usage-guide.md](./usage-guide.md) for construction examples and commands.

```sh
pnpm --filter @expense-tracker/services check-types
pnpm --filter @expense-tracker/services test
pnpm --filter @expense-tracker/services build
```
