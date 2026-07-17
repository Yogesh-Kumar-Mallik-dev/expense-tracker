# Expense Tracker

A modern, offline-first, cross-platform expense tracker built as a **Turborepo** monorepo.

The project consists of a single backend powering three frontend applications. All business logic is shared through a common service layer, allowing every platform to behave consistently while supporting offline operation through a local SQLite database.

---

# Features

- 💰 Expense Tracking
- 📊 Budget Management
- 🏦 Multiple Accounts
- 🏷️ Categories & Tags
- 📎 Transaction Attachments
- 📱 Cross Platform
- 🌐 Offline First
- 🔄 Automatic Synchronization
- 🔐 Secure Authentication
- ⚡ Shared Business Logic
- 🧩 Shared UI Components
- ✅ End-to-End Type Safety

---

# Technology Stack

## Frontend

- Next.js (Web)
- Tauri + React (Desktop)
- React Native + Expo (Mobile)

## Backend

- Next.js Route Handlers
- Prisma ORM
- PostgreSQL

## Offline Storage

- Drizzle ORM
- SQLite

## Synchronization

- PowerSync

## Shared

- TypeScript
- Turborepo
- Zod

---

# Architecture

```text
                           ┌─────────────────────────────┐
                           │       Next.js Backend       │
                           │─────────────────────────────│
                           │ • REST API                  │
                           │ • Authentication            │
                           │ • Authorization             │
                           │ • Business Endpoints        │
                           │ • Prisma ORM                │
                           └──────────────┬──────────────┘
                                          │
                                    Prisma ORM
                                          │
                                          ▼
                                 PostgreSQL Database
                                          ▲
                                          │
                                   PowerSync Cloud
                                          ▲
                                          │
        ═══════════════════════════════════════════════════════════════════════
                                          │
                                   PowerSync Client
                                          │
                                          ▼
                                  SQLite Database
                                          ▲
                                          │
                                    Drizzle ORM
                                          ▲
                                          │
                          ┌───────────────┴───────────────┐
                          │       Service Layer           │
                          │───────────────────────────────│
                          │ • Business Logic              │
                          │ • Validation                  │
                          │ • Repositories                │
                          │ • Offline Support             │
                          │ • Synchronization             │
                          │ • API Communication           │
                          └───────────────┬───────────────┘
                                          │
        ┌─────────────────────────────────┼────────────────────────────────┐
        │                                 │                                │
┌───────▼────────┐               ┌────────▼────────┐              ┌────────▼────────┐
│   Next.js Web  │               │ Tauri Desktop   │              │ React Native    │
│                │               │                 │              │ Expo Mobile     │
└────────────────┘               └─────────────────┘              └─────────────────┘
```

---

# Project Structure

```text
.
├── apps
│   ├── api/                     # Next.js backend
│   ├── web/                     # Initialized Next.js frontend
│   ├── desktop/                 # Initialized Tauri + React application
│   └── mobile/                  # Initialized Expo + NativeWind application
│
├── packages
│   ├── db-main/                 # Prisma + PostgreSQL
│   ├── db-offline/              # Drizzle + SQLite + PowerSync
│   ├── logger/                  # Shared structured and visual logging
│   ├── services/                # Shared business logic
│   ├── ui-web/                  # Shared Next.js and Tauri UI
│   ├── ui-native/               # Shared Expo and React Native UI
│   └── eslint-config/           # Shared lint configuration
│
├── tests/                       # Central grouped test workspace
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.json
```

---

# Applications

| Application | Description                                                  |
| ----------- | ------------------------------------------------------------ |
| **api**     | Implemented Next.js backend exposing REST and PowerSync APIs |
| **web**     | Initialized Next.js App Router application                   |
| **desktop** | Initialized Tauri v2, React, and Vite application            |
| **mobile**  | Initialized Expo SDK 57 and NativeWind application           |

---

# Shared Packages

| Package           | Responsibility                                                      |
| ----------------- | ------------------------------------------------------------------- |
| **services**      | Shared business logic, validation, repositories, offline operations |
| **db-main**       | Prisma schema and PostgreSQL access (backend only)                  |
| **db-offline**    | Drizzle, SQLite, platform drivers, and PowerSync client integration |
| **logger**        | Boxed logs, JSON export, correlation, and database adapters         |
| **ui-web**        | Shared DOM components for Next.js and Tauri                         |
| **ui-native**     | Shared React Native components for Expo                             |
| **eslint-config** | Shared ESLint configuration                                         |

---

# Imports and workspace boundaries

- Each TypeScript app or package owns a local `@/*` alias in its `tsconfig.json`.
- API imports resolve `@/*` from `apps/api`; library imports resolve `@/*` from that package's `src` directory.
- Cross-package imports use declared workspace package names such as `@expense-tracker/services`. Do not use a local alias to cross a package boundary.
- `pnpm-workspace.yaml` discovers projects under `apps/*`, `packages/*`, and the root `tests` workspace. Deployment-only directories such as `powersync/` are intentionally outside the package graph.
- All tests live in the root `tests/` workspace and are grouped by target.

---

# Documentation

Each application and package contains:

- `README.md` for purpose, status, and quick orientation.
- `docs.md` for architecture, boundaries, and design decisions.
- `usage-guide.md` for commands and integration examples.

Start with the implemented components:

- [Next.js API](./apps/api/README.md)
- [Next.js web](./apps/web/README.md)
- [Tauri desktop](./apps/desktop/README.md)
- [Expo mobile](./apps/mobile/README.md)
- [Shared services](./packages/services/README.md)
- [Main PostgreSQL database](./packages/db-main/README.md)
- [Offline SQLite database](./packages/db-offline/README.md)
- [Shared logger](./packages/logger/README.md)
- [PowerSync deployment](./powersync/README.md)

---

# Data Flow

## Online

```text
User
 │
 ▼
UI
 │
 ▼
Service Layer
 │
 ▼
SQLite (Drizzle)
 │
 ▼
PowerSync Client
 │
 ▼
PowerSync Cloud
 │
 ▼
Next.js Backend
 │
 ▼
Prisma
 │
 ▼
PostgreSQL
```

---

## Offline

```text
User
 │
 ▼
UI
 │
 ▼
Service Layer
 │
 ▼
SQLite (Drizzle)
```

The application remains fully functional while offline. All changes are written to the local SQLite database.

---

## Synchronization

```text
SQLite
   ▲
   │
Drizzle ORM
   │
Service Layer
   │
PowerSync Client
   │
══════════ Internet ══════════
   │
PowerSync Cloud
   │
Next.js Backend
   │
Prisma
   │
PostgreSQL
```

PowerSync automatically synchronizes local changes with the backend whenever connectivity is available.

---

# Design Principles

- Offline-first architecture
- Single backend
- Shared business logic
- Platform-specific UI
- Type-safe APIs
- Shared validation
- Repository pattern
- Modular package architecture
- End-to-end TypeScript
- Backend owns the source of truth
- Local SQLite enables offline operation
- Automatic synchronization using PowerSync

---

# Development

## Install dependencies

```bash
pnpm install
```

## Start development

```bash
pnpm dev
```

Run one development target from the repository root:

```bash
pnpm dev:api          # Next.js API on http://localhost:3001
pnpm dev:web          # Next.js web app on http://localhost:3000
pnpm dev:desktop      # Vite renderer on http://localhost:1420
pnpm dev:tauri        # Complete Tauri desktop application
pnpm dev:mobile       # Expo development client
pnpm dev:mobile:web   # Expo web
pnpm dev:mobile:android
pnpm dev:mobile:ios
```

## Build

```bash
pnpm build
```

Targeted builds are available as `pnpm build:api`, `pnpm build:web`,
`pnpm build:desktop`, `pnpm build:tauri`, and `pnpm build:mobile`.

## Type checking

```bash
pnpm check-types
```

## Lint

```bash
pnpm lint
```

## Format

```bash
pnpm format
```

---

# License

MIT
