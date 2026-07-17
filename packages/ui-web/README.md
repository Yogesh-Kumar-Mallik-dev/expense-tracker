# Web UI

Shared product frontend for the Next.js web and Tauri desktop applications.
The transaction register is the primary workflow; accounts, budgets, reports,
synchronization, settings, and the restrained overview are separate route-level
screens.

All implementation belongs in `ui-src/`. Platform application directories
contain only bootstrap and platform integration code.

Read [frontend-design.md](./frontend-design.md) for the research, product
patterns, backend capability audit, and intentionally unavailable features.
