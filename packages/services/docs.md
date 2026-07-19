# Shared Services

See [usage-guide.md](./usage-guide.md) for construction and calling examples.

`@expense-tracker/services` is the shared business-logic layer described by the
root README. Backend business endpoints, web, desktop, and mobile call these
services so validation and domain behavior are not duplicated by platform.

## Architecture

Services depend on repository ports, not Prisma, Drizzle, PowerSync, React, or
HTTP. Application bootstrap code supplies the appropriate implementation:

```text
Backend route ── db-main adapter ──┐
                                   ├── service ── validation/domain rules
Client UI ───── db-offline adapter ┘
```

Version 1 implements:

- `AccountService`
- `TransactionService`
- `CategoryService`
- `TagService`
- `BudgetService`
- `AttachmentService`
- `DeviceService`
- `UserService` for shared profile behavior (authentication remains separate)
- `BudgetCategoryService` and `TransactionTagService`
- `ReportingService` for derived balances and budget usage
- Permanent sync-conflict and partial-workflow contracts
- Shared UUID and clock abstractions

Concrete adapters are exported from both database packages:

- `@expense-tracker/db-main/adapters/services`
- `@expense-tracker/db-offline/adapters/services`

## Offline concurrency rules

Every service function has a `Concurrency note` explaining why it remains safe
under concurrent offline writes.

Services must never:

- Read a stored value and persist an increment, decrement, toggle, or append.
- Hard-delete a synchronized row; deletion writes `deletedAt`.
- Claim a multi-row local write is atomic after PowerSync upload.
- Require a parent row to exist remotely before allowing an offline write.
- Implement uniqueness with check-then-insert.
- Generate sequential IDs; rows receive UUIDs before insertion.

Balances, budget usage, counts, and totals are computed from source rows on read.
Timestamps may be used for presentation but never as an unacknowledged conflict
resolution mechanism.

## Cross-domain workflows

Transaction creation writes only the transaction row. Tags and attachments are
separate operations because PowerSync may upload those rows independently. A
higher orchestration layer may improve UX around these actions, but it must
represent partial completion honestly and support retry/recovery.

## Repository ports

Ports use platform-neutral records: UUID strings, ISO timestamp strings, and
decimal money strings. Database adapters translate those records to Prisma or
Drizzle types. Services do not perform remote existence checks for foreign keys;
offline applications use locally known IDs and synchronize parents separately.

Create, update, assignment, envelope-activity, profile, device, and sync-state
schemas are exported as domain contracts. Authoritative transports such as the
PowerSync upload boundary compose these schemas rather than maintaining weaker
copies. A transport must still perform ownership and cross-record relationship
checks because those require authoritative persistence.

Reporting adapters intentionally run unpaginated source-row queries. Reusing a
paginated UI transaction query would silently undercount balances and budgets.

## Budget modes

Budgets use an explicit strategy. `SPENDING_LIMIT` is the default and treats
the amount as a warning threshold. `ENVELOPE` is opt-in and derives available
money from carry-over, allocations, activity, and transfers.

Money remains a four-decimal fixed-point string. Spent, remaining, available,
and ready-to-assign values are computed projections, never stored counters.
Allocations and transfers are immutable source records with tombstones.

Mode conversion is preview-first. Confirming a conversion must create a new
plan and archive the source; it must never reinterpret historical transactions.
Envelope transfers cannot create or destroy money, negative availability stays
visible, and cross-currency activity is excluded and reported.
