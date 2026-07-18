# Client Core Usage Guide

Construct the application in a platform bootstrap and pass it to the UI:

```tsx
const session = new ApplicationSessionController({
  transport,
  credentials,
  localDatabase,
  sync,
});
const data = new RestExpenseClient(apiBaseUrl, session);
const application = { session, data, localDatabase, sync };

<ExpenseApp application={application} platform="desktop" />;
```

Do not store refresh tokens in `localStorage`, ordinary SQLite tables, React
state, or logs. Platform credential adapters are responsible for persistence.
