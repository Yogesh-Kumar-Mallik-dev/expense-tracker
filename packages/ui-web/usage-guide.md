# Web UI Usage Guide

Import components through the package boundary:

```tsx
import { ExpenseApp } from "@expense-tracker/ui-web";
import type { ExpenseApplication } from "@expense-tracker/client-core";

<ExpenseApp application={application} platform="web" />;
```

The platform host constructs an `ExpenseApplication` and injects it into the
shared UI. The UI does not create a REST client or own session persistence.
Web refresh credentials use a same-origin HttpOnly cookie. Desktop refresh
credentials use the operating-system credential vault.

The settings route exposes JSONL export from the bounded browser diagnostics
transport. Client logs are structured and rendered as non-ANSI boxes in the
developer console.

Routes use hashes so the same navigation works in both hosts:

```text
#/transactions
#/accounts
#/budgets
#/reports
#/sync
#/settings
```

Registry components are configured by `components.json`. Add a supported
component from the repository root:

```bash
pnpm dlx shadcn@latest add @reui/<component> --cwd packages/ui-web
```

Add behavior tests under `tests/ui-web/`, then run:

```bash
pnpm test:web
pnpm --filter @expense-tracker/ui-web check-types
pnpm build:web
pnpm build:desktop
```
