# Expense Tracker Logger

`@expense-tracker/logger` is the shared observability package for the API and
offline clients. It preserves the readable boxed-log spirit of the reference
logger while using contracts designed for this project's Next.js, Prisma,
Drizzle, PowerSync, and offline workflows.

See [docs.md](./docs.md) for architecture and security decisions and
[usage-guide.md](./usage-guide.md) for integration examples.

```sh
pnpm --filter @expense-tracker/logger check-types
pnpm --filter @expense-tracker/logger test
pnpm --filter @expense-tracker/logger build
```

## Exports

- `@expense-tracker/logger` — portable contracts, logger, formatter, and request
  metadata.
- `@expense-tracker/logger/node` — boxed terminal and rotating JSONL transports
  plus request context.
- `@expense-tracker/logger/browser` — non-breaking client boxes and downloadable
  diagnostics.
- `@expense-tracker/logger/database` — Prisma and Drizzle operation adapters.
