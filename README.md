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
│   ├── web/                     # Planned Next.js frontend
│   ├── desktop/                 # Planned Tauri application
│   └── mobile/                  # Planned React Native application
│
├── packages
│   ├── db-main/                 # Prisma + PostgreSQL
│   ├── db-offline/              # Drizzle + SQLite + PowerSync
│   ├── services/                # Shared business logic
│   └── eslint-config/           # Shared lint configuration
│
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
| **web**     | Planned Next.js web application                              |
| **desktop** | Planned Tauri desktop application                            |
| **mobile**  | Planned React Native/Expo application                        |

---

# Shared Packages

| Package           | Responsibility                                                      |
| ----------------- | ------------------------------------------------------------------- |
| **services**      | Shared business logic, validation, repositories, offline operations |
| **db-main**       | Prisma schema and PostgreSQL access (backend only)                  |
| **db-offline**    | Drizzle, SQLite, platform drivers, and PowerSync client integration |
| **eslint-config** | Shared ESLint configuration                                         |

---

# Documentation

Each application and package contains:

- `README.md` for purpose, status, and quick orientation.
- `docs.md` for architecture, boundaries, and design decisions.
- `usage-guide.md` for commands and integration examples.

Start with the implemented components:

- [Next.js API](./apps/api/README.md)
- [Shared services](./packages/services/README.md)
- [Main PostgreSQL database](./packages/db-main/README.md)
- [Offline SQLite database](./packages/db-offline/README.md)

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

## Build

```bash
pnpm build
```

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
