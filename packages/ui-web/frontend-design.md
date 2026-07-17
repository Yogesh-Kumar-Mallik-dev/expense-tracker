# Frontend product design

## Research summary

The frontend is transaction-first. Mature finance tools treat the account or
transaction register as the primary workspace:

- Actual Budget keeps transaction entry, search, filters, import, account
  context, and batch operations adjacent to the register.
- GnuCash uses a dense register with explicit dates, descriptions, amounts, and
  reconciliation state. Reconciliation is omitted here because this project
  has no cleared or reconciled domain fields.
- Firefly III separates import conversion/validation from committing records
  and exposes category automation as explicit rules. This project has neither
  import nor rule services, so the UI must not imply either exists.
- Local-first products expose local availability independently of server
  reachability. This repository has PowerSync connection helpers, but no
  application-facing status model yet.

ReUI is the selected component library. Its official integration is a
copy-owned shadcn registry using React 19, Tailwind CSS v4, semantic tokens, and
either Base UI or Radix primitives. The old `reui.tsx` file is not a registry
installation and must not be described as ReUI.

## Problems removed from the old frontend

- Navigation changed a heading while every section remained visible.
- Search and notifications were nonfunctional.
- Every transaction was labelled `Synced` without sync state.
- `Backend connected` was inferred from rendered data.
- Monthly spending was calculated from one paginated transaction page.
- Monetary strings were converted to floating point.
- The authenticated screen used marketing copy and repeated card layouts.
- One component owned authentication, navigation, fetching, calculations,
  tables, forms, and dialogs.
- `Promise.all` made one failed request erase unrelated usable data.
- Network responses were trusted through casts and non-null assertions.
- Login stored access and refresh tokens in `localStorage`.
- Tests proved only that the runner and one badge worked.

## Information architecture

The shared DOM application has six route-level screens:

1. Transactions — default; searchable, server-filtered register with paging,
   add/edit/delete, explicit empty/error/loading states.
2. Accounts — account list with reporting-service balances and archive-aware
   domain actions.
3. Budgets — period-based simple-limit and envelope read models.
4. Reports — honest dependency state. Existing reporting supports current
   balances and budget usage, but not time-series/category reports or
   drill-down aggregates.
5. Synchronization — honest dependency state until the app bootstrap exposes
   PowerSync connection, upload queue, last-sync, and conflict state.
6. Settings — profile and authenticated-session actions supported by current
   endpoints; device sessions are listed when available.

Overview is a restrained orientation screen, not the default and not a
collection of invented metrics.

Routes are represented in the shared package through a history-backed router
adapter so both Next.js and Tauri can use the same screens. The browser path is
the source of truth; navigation changes the rendered workflow.

## Architecture

```text
ExpenseApp
├── auth/session controller
├── app shell and route controller
└── route screen
    ├── feature controller (request state, cancellation, retry)
    ├── validated API client
    ├── view-model mapping
    └── ReUI/shadcn presentational primitives
```

Money formatting consumes four-decimal strings and never converts domain money
to JavaScript `number`. Percentage display may use integer fixed-point ratios.

## ReUI component plan

Use registry-owned or underlying shadcn components for:

- Button, Input, Label, Select and Alert for forms.
- Dialog for short create/edit/confirm workflows.
- Table for the transaction register and account/budget lists.
- Pagination for server pagination.
- Dropdown Menu for row actions.
- Skeleton for stable loading layouts.
- Tooltip for icon-only controls.

The full ReUI data grid is intentionally deferred: the current API supports
server pagination and filters but no server sorting contract, and the initial
register does not need virtualization. A semantic ReUI/shadcn table is smaller
and more truthful.

## Missing dependencies

- Secure web session transport. Current API returns bearer tokens and does not
  provide an HttpOnly-cookie/BFF flow. The frontend cannot make browser token
  persistence secure by itself.
- PowerSync status adapter for online/offline, pending writes, active sync,
  last successful sync, failures, and permanent conflicts.
- Reporting endpoints for monthly spending, category totals, period
  comparisons, time series, net worth, and report drill-down.
- CSV import/preview/mapping/duplicate-detection service.
- Cleared and reconciled transaction fields and workflows.
- Payee/merchant domain distinct from transaction description.
- Notification domain.
- Server-side transaction search and sorting parameters.
- Batch transaction mutation endpoints.

These capabilities remain absent or explicitly labelled unavailable. They are
not approximated from a paginated page.

## Design tokens and responsive behavior

Tokens define typography, spacing, borders, radii, elevation, focus, semantic
colors, content width, and register density. Surfaces are mostly border-based;
shadows are reserved for overlays. Money uses tabular numerals.

Desktop and tablet use the full register. Narrow screens use compact
transaction rows preserving date, description, account, category, and amount;
filters move into a disclosure panel and create/edit uses a full-height sheet.

## Accessibility baseline

- One `h1` per route and logical subordinate headings.
- Landmark navigation with current-page state.
- Native table headers and captions.
- Visible `:focus-visible` treatment.
- Labelled inputs and associated error text.
- `aria-live` for request and form results.
- Escape and focus restoration for dialogs.
- Minimum 44px touch targets on compact layouts.
- Status is expressed through text and icon, never color alone.
- Reduced-motion styles disable nonessential animation.
