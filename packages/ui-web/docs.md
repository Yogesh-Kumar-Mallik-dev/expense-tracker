# Web UI Architecture

`@expense-tracker/ui-web` owns the DOM product interface shared by the Next.js
web and Tauri desktop applications. Components live exclusively in `ui-src/`.

The package must not import Next.js, Tauri APIs, application bootstrap code, or
React Native. Consumers compose these primitives with platform behavior.

## Structure

- `src/screens/` contains route-level workflows and transaction forms.
- `src/shell.tsx` owns hash routing and responsive application navigation.
- `src/api.ts` is the REST adapter and validates every successful response with
  Zod before exposing data to a screen.
- `src/money.ts` formats decimal strings with fixed-point operations and never
  converts domain money to JavaScript floating point.
- `components/ui/` contains official shadcn/ReUI registry components.
- `components/reui/` contains components installed from the ReUI registry.
- `styles.css` owns documented semantic tokens and responsive product layout.

## Product boundaries

The frontend only exposes backend capabilities verified in the API and service
packages. It does not infer synchronization state from loaded records, calculate
aggregate totals from a paginated response, or persist bearer tokens in browser
storage.

Current route screens are:

- Transactions: filterable, paginated register plus create, edit, and delete.
- Accounts: real account records and reporting-service balances.
- Budgets: current-period limits or envelope availability from real usage data.
- Reports: an honest unavailable state pending reporting endpoints.
- Synchronization: an honest unavailable state pending PowerSync status wiring.
- Settings: session identity and sign-out.
- Overview: workflow shortcuts without invented metrics.

See `frontend-design.md` for research sources, accessibility requirements, and
missing service dependencies.
