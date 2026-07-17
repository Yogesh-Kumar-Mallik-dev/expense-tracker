# Web UI Usage Guide

Import components through the package boundary:

```tsx
import { ExpenseApp } from "@expense-tracker/ui-web";

<ExpenseApp apiBaseUrl="/backend" platform="web" />;
```

Add tests under `tests/ui-web/` and run `pnpm test:web`.
