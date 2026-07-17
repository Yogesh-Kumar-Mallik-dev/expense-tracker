# Web UI Usage Guide

Import components through the package boundary:

```tsx
import { ExpenseApp } from "@expense-tracker/ui-web";

<ExpenseApp apiBaseUrl="/backend" platform="web" />;
```

The web application proxies `/backend/*` to the API. Desktop can pass its
configured API origin instead. Authentication is held in memory until a
same-origin secure-cookie or platform credential adapter is implemented.

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
