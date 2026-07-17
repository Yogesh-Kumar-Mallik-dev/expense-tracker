# Web Application

Initialized Next.js App Router client for the offline-first web experience.

The application uses TypeScript, React, the shared ESLint configuration, and a
local `@/*` import alias. Workspace dependencies on `db-offline`, `services`,
and `logger` are declared explicitly so pnpm's isolated dependency layout
cannot hide undeclared imports.

Run `pnpm --filter @expense-tracker/web dev` for development or
`pnpm --filter @expense-tracker/web build` for a production build.

See [docs.md](./docs.md) for boundaries and
[usage-guide.md](./usage-guide.md) for the next integration steps.
