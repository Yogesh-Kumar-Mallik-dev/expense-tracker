# Client Core Usage Guide

Construct the application in a platform bootstrap and pass it to the UI:

```tsx
const session = new ApplicationSessionController({
  transport,
  credentials,
  localDatabase,
  sync,
});
const data = new RestExpenseClient(apiBaseUrl, session, () => {
  const state = session.state();
  return state.status === "authenticated" ? state.session.user.timezone : "UTC";
});
const application = { session, data, localDatabase, sync };

<ExpenseApp application={application} platform="desktop" />;
```

Do not store refresh tokens in `localStorage`, ordinary SQLite tables, React
state, or logs. Platform credential adapters are responsible for persistence.

Pass financial calendar dates such as `2026-07-19`, not device-local
timestamps, to transaction filters and reporting methods. The client converts
them using the supplied financial timezone.
