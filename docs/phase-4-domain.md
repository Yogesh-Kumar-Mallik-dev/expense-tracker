# Phase 4 domain decisions

This document records the product behavior adopted before extending the
financial domain. Repository invariants remain authoritative; mature products
were used to choose familiar workflows where the repository was previously
silent.

## Transaction imports

- Import is preview-first and does not mutate data until confirmation.
- A normalized SHA-256 fingerprint is stored on imported transactions. It uses
  account identity, transaction type, date, exact decimal amount, currency,
  transfer account, category, description, and note.
- The fingerprint is unique per user while the transaction is active.
- A matching active fingerprint is skipped and reported, never silently
  duplicated or overwritten.
- Tombstoned imports remain tombstoned by default. Re-importing deleted records
  requires a future explicit recovery choice.
- CSV validation and reference resolution happen before confirmation. Commit
  remains row-independent offline, so partial failures are reported.

This follows Actual Budget's preference for provider identifiers followed by
stable transaction matching, while avoiding fuzzy automatic merges that this
project cannot yet explain or undo.

## Scheduled transactions

- A schedule is a template, not a transaction and not part of balances.
- The initial supported frequencies are weekly, monthly, and yearly with a
  positive interval.
- Monthly dates clamp to the final day of shorter months.
- The user explicitly approves each due occurrence. Automatic posting is
  deferred until background execution and notification guarantees exist.
- Materialization records `(scheduleId, occurrenceDate)` so retries cannot
  create the same occurrence twice.
- Skipping is an explicit occurrence record and does not create a transaction.
- Editing a schedule affects future occurrences only.
- Dates are interpreted in the user's configured IANA financial timezone.
- Due occurrence generation is idempotent and server-authoritative. Manual post
  converts the financial date to a stable local-noon instant in that timezone.

Actual Budget and GnuCash both distinguish the schedule from the generated
register transaction and support review before creation. This project adopts
manual approval as the safe first behavior.

## Backup and restore

- Backup is a versioned, validated snapshot of user-owned financial source
  records. Authentication secrets, refresh tokens, device credentials, local
  queues, and attachment bytes are excluded.
- Restore is not a merge. It creates a named, separately stored dataset for
  inspection; it never mutates the active synchronized namespace.
- A restore must validate the complete archive and schema version before any
  mutation.
- Opening a staged restore creates a new per-user local database and imports
  the validated snapshot there. It never writes into the active synchronized
  database.
- Synchronization is disabled while the restored dataset is open. This makes
  it suitable for inspection and export without allowing another device to
  race the restore or resurrect tombstones.
- Replacing the server-authoritative synchronized dataset remains a separate,
  intentionally unsupported operation.

This mirrors Actual Budget's restore-as-a-separate-file workflow rather than
silently overwriting a live synchronized dataset.

## Reconciliation

- Reconciliation is account-specific.
- Transfers require independent state for the source and destination account,
  so a single `Transaction.reconciledAt` field would be incorrect.
- `AccountTransactionState` stores independent pending, cleared, and reconciled
  state for each account side of a transaction plus statement date.
- Finishing reconciliation is allowed only when the selected cleared balance
  equals the entered statement balance exactly in fixed-point units.

Actual Budget and GnuCash both reconcile an account against a statement balance.
Completion is an authoritative atomic command. It verifies ownership, account
membership, statement cutoff, and exact fixed-point equality before locking the
selected account-side records.

## Net worth and balance history

- History is computed from opening balances and source transactions for every
  requested financial date; no mutable daily counters are stored.
- Transfers do not change total net worth.
- Currencies are never added together without an exchange-rate source, so every
  point is currency-specific.
- Requests are bounded to 366 days to prevent an accidental unbounded
  calculation.

## Product references

- [Actual Budget transaction importing](https://actualbudget.org/docs/transactions/importing/)
- [Actual Budget schedules](https://actualbudget.org/docs/schedules/)
- [Actual Budget backup](https://actualbudget.org/docs/backup-restore/backup/)
- [Actual Budget restore](https://actualbudget.org/docs/backup-restore/restore/)
- [Actual Budget reconciliation](https://actualbudget.org/docs/accounts/reconciliation)
- [GnuCash scheduled transactions](https://lists.gnucash.org/docs/C/gnucash-guide/txns-sxn1.html)
- [GnuCash account reconciliation](https://wiki.gnucash.org/docs/C/gnucash-manual/acct-reconcile.html)
