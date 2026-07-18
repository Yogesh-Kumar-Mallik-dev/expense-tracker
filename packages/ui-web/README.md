# Web UI

Shared product frontend for the Next.js web and Tauri desktop applications.
The transaction register is the primary workflow. Account onboarding,
categories and tags, both budget modes, transaction attachments, profile
settings, and device management use the existing backend contracts. Reports
and synchronization remain honest dependency states.

All implementation belongs in `ui-src/`. Platform application directories
contain only bootstrap and platform integration code.

Read [frontend-design.md](./frontend-design.md) for the research, product
patterns, backend capability audit, and intentionally unavailable features.
