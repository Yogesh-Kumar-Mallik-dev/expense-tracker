import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert";
import { Button } from "#components/ui/button";
import { Input } from "#components/ui/input";
import { Label } from "#components/ui/label";
import { Skeleton } from "#components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components/ui/table";
import {
  ApiError,
  previewTransactionCsv,
  fingerprintTransactionCsvRow,
  writeTransactionCsv,
  type Account,
  type Category,
  type ExpenseDataClient,
  type PageMeta,
  type Transaction,
  type TransactionFilters,
} from "../api";
import { formatMoney } from "../money";
import { TransactionForm } from "./transaction-form";
import { SelectField } from "./select-field";

const initialMeta: PageMeta = {
  page: 1,
  pageSize: 25,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false,
};

export function TransactionsScreen({
  api,
  onUnauthorized,
}: {
  api: ExpenseDataClient;
  onUnauthorized: () => void;
}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [meta, setMeta] = useState(initialMeta);
  const [filters, setFilters] = useState<TransactionFilters>(() => {
    const query = new URLSearchParams(window.location.hash.split("?")[1] ?? "");
    return {
      page: 1,
      pageSize: 25,
      ...(query.get("accountId") ? { accountId: query.get("accountId")! } : {}),
      ...(query.get("categoryId")
        ? { categoryId: query.get("categoryId")! }
        : {}),
      ...(query.get("from") ? { from: query.get("from")! } : {}),
      ...(query.get("to") ? { to: query.get("to")! } : {}),
    };
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [referenceError, setReferenceError] = useState("");
  const [editing, setEditing] = useState<Transaction | "new" | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [recentlyDeleted, setRecentlyDeleted] = useState<Transaction | null>(
    null,
  );
  const [transferringFile, setTransferringFile] = useState(false);
  const [fileMessage, setFileMessage] = useState("");
  const setOptionalFilter = (
    key: "accountId" | "categoryId" | "from" | "to",
    value: string,
  ) =>
    setFilters((current) => {
      const next = { ...current, page: 1 };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });

  const loadReferences = useCallback(
    async (signal?: AbortSignal) => {
      const results = await Promise.allSettled([
        api.accounts(signal),
        api.categories(signal),
      ]);
      if (signal?.aborted) return;
      const [accountResult, categoryResult] = results;
      if (accountResult.status === "fulfilled")
        setAccounts(accountResult.value.data);
      if (categoryResult.status === "fulfilled")
        setCategories(categoryResult.value.data);
      const failures = results.filter((result) => result.status === "rejected");
      setReferenceError(
        failures.length
          ? "Some account or category names could not be loaded. Transaction rows remain available."
          : "",
      );
    },
    [api],
  );

  const loadTransactions = useCallback(
    async (signal?: AbortSignal, background = false) => {
      if (background) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        const response = await api.transactions(filters, signal);
        if (signal?.aborted) return;
        setTransactions(response.data);
        setMeta(response.meta ?? initialMeta);
      } catch (caught) {
        if (signal?.aborted) return;
        if (caught instanceof ApiError && caught.status === 401)
          return onUnauthorized();
        setError(
          caught instanceof Error
            ? caught.message
            : "Transactions could not be loaded.",
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [api, filters, onUnauthorized],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadReferences(controller.signal);
    return () => controller.abort();
  }, [loadReferences]);

  useEffect(() => {
    const controller = new AbortController();
    void loadTransactions(controller.signal);
    return () => controller.abort();
  }, [loadTransactions]);

  useEffect(() => {
    const timeout = window.setTimeout(
      () =>
        setFilters((current) => {
          const value = search.trim();
          if ((current.search ?? "") === value) return current;
          const next = { ...current, page: 1 };
          if (value) next.search = value;
          else delete next.search;
          return next;
        }),
      250,
    );
    return () => window.clearTimeout(timeout);
  }, [search]);

  const visibleTransactions = useMemo(() => transactions, [transactions]);

  const remove = async (transaction: Transaction) => {
    if (
      !window.confirm(
        `Delete ${transaction.description || "this transaction"}? This action cannot be undone.`,
      )
    )
      return;
    setDeleting(transaction.id);
    setError("");
    try {
      await api.deleteTransaction(transaction.id);
      setRecentlyDeleted(transaction);
      await loadTransactions(undefined, true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The transaction could not be deleted.",
      );
    } finally {
      setDeleting(null);
    }
  };
  const exportCsv = async () => {
    setTransferringFile(true);
    try {
      const rows: Transaction[] = [];
      for (let page = 1; ; page += 1) {
        const result = await api.transactions({
          ...filters,
          page,
          pageSize: 100,
        });
        rows.push(...result.data);
        if (!result.meta?.hasNext) break;
      }
      const accountNames = new Map(
        accounts.map((value) => [value.id, value.name]),
      );
      const categoryNames = new Map(
        categories.map((value) => [value.id, value.name]),
      );
      const csv = writeTransactionCsv(
        rows.map((value) => ({
          date: value.occurredAt.slice(0, 10),
          type: value.type,
          amount: value.amount,
          currency: value.currency,
          account: accountNames.get(value.accountId) ?? value.accountId,
          transferAccount: value.transferAccountId
            ? (accountNames.get(value.transferAccountId) ??
              value.transferAccountId)
            : "",
          category: value.categoryId
            ? (categoryNames.get(value.categoryId) ?? value.categoryId)
            : "",
          description: value.description ?? "",
          note: value.note ?? "",
        })),
      );
      const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "CSV export failed.");
    } finally {
      setTransferringFile(false);
    }
  };
  const importCsv = async (file: File) => {
    setTransferringFile(true);
    setFileMessage("");
    try {
      const preview = previewTransactionCsv(await file.text());
      const firstInvalid = preview.invalid[0];
      if (firstInvalid)
        throw new Error(
          `Row ${firstInvalid.rowNumber}: ${firstInvalid.message}`,
        );
      if (!preview.valid.length)
        throw new Error("CSV contains no transaction rows.");
      if (!window.confirm(`Import ${preview.valid.length} transactions?`))
        return;
      const accountIds = new Map(
        accounts.map((value) => [value.name.toLocaleLowerCase(), value.id]),
      );
      const categoryIds = new Map(
        categories.map((value) => [value.name.toLocaleLowerCase(), value.id]),
      );
      const failures: string[] = [];
      const fingerprints = new Set<string>();
      for (let page = 1; ; page += 1) {
        const existing = await api.transactions({ page, pageSize: 100 });
        for (const transaction of existing.data)
          if (transaction.importFingerprint)
            fingerprints.add(transaction.importFingerprint);
        if (!existing.meta?.hasNext) break;
      }
      let duplicates = 0;
      for (const row of preview.valid) {
        const accountId = accountIds.get(row.value.account.toLocaleLowerCase());
        const transferAccountId = row.value.transferAccount
          ? accountIds.get(row.value.transferAccount.toLocaleLowerCase())
          : undefined;
        const categoryId = row.value.category
          ? categoryIds.get(row.value.category.toLocaleLowerCase())
          : undefined;
        if (
          !accountId ||
          (row.value.transferAccount && !transferAccountId) ||
          (row.value.category && !categoryId)
        ) {
          failures.push(
            `row ${row.rowNumber}: referenced account or category was not found`,
          );
          continue;
        }
        const importFingerprint = await fingerprintTransactionCsvRow(
          row.value,
          {
            accountId,
            transferAccountId: transferAccountId ?? null,
            categoryId: categoryId ?? null,
          },
        );
        if (fingerprints.has(importFingerprint)) {
          duplicates += 1;
          continue;
        }
        try {
          await api.createTransaction({
            accountId,
            transferAccountId: transferAccountId ?? null,
            categoryId: categoryId ?? null,
            type: row.value.type,
            amount: row.value.amount,
            currency: row.value.currency,
            description: row.value.description || null,
            note: row.value.note || null,
            importFingerprint,
            occurredAt: new Date(`${row.value.date}T12:00:00`).toISOString(),
          });
          fingerprints.add(importFingerprint);
        } catch (caught) {
          failures.push(
            `row ${row.rowNumber}: ${caught instanceof Error ? caught.message : "creation failed"}`,
          );
        }
      }
      await loadTransactions(undefined, true);
      if (failures.length)
        setError(
          `${preview.valid.length - failures.length - duplicates} imported; ${duplicates} duplicates skipped; ${failures.length} failed. ${failures[0]}`,
        );
      else if (duplicates)
        setFileMessage(`${duplicates} duplicate transaction(s) were skipped.`);
      else setFileMessage(`${preview.valid.length} transaction(s) imported.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "CSV import failed.");
    } finally {
      setTransferringFile(false);
    }
  };

  return (
    <section className="route-screen" aria-labelledby="transactions-title">
      <header className="route-header">
        <div>
          <p className="eyebrow">Register</p>
          <h1 id="transactions-title">Transactions</h1>
          <p>Record and review money moving through your accounts.</p>
        </div>
        <div className="header-actions">
          <Button
            type="button"
            variant="outline"
            disabled={transferringFile}
            onClick={() => void exportCsv()}
          >
            Export CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={transferringFile}
            onClick={() =>
              document.getElementById("transaction-csv-import")?.click()
            }
          >
            Import CSV
          </Button>
          <Input
            id="transaction-csv-import"
            className="sr-only"
            type="file"
            accept=".csv,text/csv"
            disabled={transferringFile}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importCsv(file);
              event.target.value = "";
            }}
          />
          <Button
            variant="outline"
            type="button"
            onClick={() => void loadTransactions(undefined, true)}
            disabled={refreshing}
          >
            <RefreshCw className={refreshing ? "spin" : ""} /> Refresh
          </Button>
          <Button
            type="button"
            onClick={() => setEditing("new")}
            disabled={!accounts.length}
          >
            <Plus /> Add transaction
          </Button>
        </div>
      </header>

      {!accounts.length && !loading ? (
        <Alert>
          <AlertTitle>An account is required</AlertTitle>
          <AlertDescription>
            Create an account before recording a transaction.{" "}
            <button
              className="inline-action"
              type="button"
              onClick={() => {
                window.location.hash = "/accounts";
              }}
            >
              Go to Accounts
            </button>
          </AlertDescription>
        </Alert>
      ) : null}
      {referenceError ? (
        <Alert>
          <AlertTitle>Partial data</AlertTitle>
          <AlertDescription>{referenceError}</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Transactions unavailable</AlertTitle>
          <AlertDescription>
            {error}{" "}
            <button
              className="inline-action"
              type="button"
              onClick={() => void loadTransactions()}
            >
              Try again
            </button>
          </AlertDescription>
        </Alert>
      ) : null}
      {fileMessage ? <p role="status">{fileMessage}</p> : null}
      {recentlyDeleted ? (
        <Alert>
          <AlertTitle>Transaction deleted</AlertTitle>
          <AlertDescription>
            {recentlyDeleted.description || "Transaction"} was removed.{" "}
            <button
              className="inline-action"
              type="button"
              onClick={() =>
                void api
                  .restoreTransaction(recentlyDeleted.id)
                  .then(async () => {
                    setRecentlyDeleted(null);
                    await loadTransactions(undefined, true);
                  })
                  .catch((caught) =>
                    setError(
                      caught instanceof Error
                        ? caught.message
                        : "Transaction could not be restored.",
                    ),
                  )
              }
            >
              Undo
            </button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="register">
        <div className="register-toolbar">
          <div className="page-search">
            <Search aria-hidden="true" />
            <Label className="sr-only" htmlFor="transaction-search">
              Search transaction descriptions and notes
            </Label>
            <Input
              id="transaction-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search descriptions and notes"
            />
          </div>
          <details className="filters">
            <summary>
              <Filter aria-hidden="true" /> Filters
            </summary>
            <div className="filter-grid">
              <SelectField
                label="Account"
                value={filters.accountId ?? ""}
                onChange={(value) => setOptionalFilter("accountId", value)}
                placeholder="All accounts"
                options={accounts.map((account) => ({
                  value: account.id,
                  label: account.name,
                }))}
              />
              <SelectField
                label="Category"
                value={filters.categoryId ?? ""}
                onChange={(value) => setOptionalFilter("categoryId", value)}
                placeholder="All categories"
                options={categories.map((category) => ({
                  value: category.id,
                  label: category.name,
                }))}
              />
              <label>
                From
                <Input
                  type="date"
                  value={filters.from ?? ""}
                  onChange={(event) =>
                    setOptionalFilter("from", event.target.value)
                  }
                />
              </label>
              <label>
                To
                <Input
                  type="date"
                  value={filters.to ?? ""}
                  onChange={(event) =>
                    setOptionalFilter("to", event.target.value)
                  }
                />
              </label>
            </div>
          </details>
          <span className="register-count">
            {meta.total} {meta.total === 1 ? "transaction" : "transactions"}
          </span>
        </div>

        {loading ? (
          <RegisterSkeleton />
        ) : visibleTransactions.length ? (
          <div className="table-scroll">
            <Table>
              <caption className="sr-only">
                Transactions for the selected filters
              </caption>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="amount-cell">Amount</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleTransactions.map((transaction) => {
                  const account = accounts.find(
                    (item) => item.id === transaction.accountId,
                  );
                  const category = categories.find(
                    (item) => item.id === transaction.categoryId,
                  );
                  return (
                    <TableRow
                      key={transaction.id}
                      className="transaction-row"
                      onDoubleClick={() => setEditing(transaction)}
                    >
                      <TableCell>
                        {new Intl.DateTimeFormat(undefined, {
                          dateStyle: "medium",
                        }).format(new Date(transaction.occurredAt))}
                      </TableCell>
                      <TableCell>
                        <button
                          className="row-title"
                          type="button"
                          onClick={() => setEditing(transaction)}
                        >
                          {transaction.description || "No description"}
                        </button>
                        {transaction.note ? (
                          <small>{transaction.note}</small>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {category?.name ??
                          (transaction.categoryId
                            ? "Category unavailable"
                            : "Uncategorized")}
                      </TableCell>
                      <TableCell>
                        {account?.name ?? "Account unavailable"}
                      </TableCell>
                      <TableCell
                        className={`amount-cell amount-${transaction.type.toLocaleLowerCase()}`}
                      >
                        {transaction.type === "EXPENSE"
                          ? "−"
                          : transaction.type === "INCOME"
                            ? "+"
                            : ""}
                        {formatMoney(transaction.amount, transaction.currency)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          aria-label={`Delete ${transaction.description || "transaction"}`}
                          disabled={deleting === transaction.id}
                          onClick={() => void remove(transaction)}
                        >
                          <Trash2 />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="empty-state">
            <h2>
              {search
                ? "No matches on this page"
                : "No transactions in this range"}
            </h2>
            <p>
              {search
                ? "Clear the page search or change the server filters."
                : accounts.length
                  ? "Add a transaction or change the filters."
                  : "Create an account before recording transactions."}
            </p>
            {!search && accounts.length ? (
              <Button type="button" onClick={() => setEditing("new")}>
                <Plus /> Add transaction
              </Button>
            ) : null}
          </div>
        )}

        <footer className="register-footer">
          <span>
            Page {meta.totalPages ? meta.page : 0} of {meta.totalPages}
          </span>
          <div>
            <Button
              variant="outline"
              size="icon"
              type="button"
              aria-label="Previous page"
              disabled={!meta.hasPrevious}
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  page: current.page - 1,
                }))
              }
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              type="button"
              aria-label="Next page"
              disabled={!meta.hasNext}
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  page: current.page + 1,
                }))
              }
            >
              <ChevronRight />
            </Button>
          </div>
        </footer>
      </div>

      <TransactionForm
        open={editing !== null}
        transaction={editing === "new" ? null : editing}
        accounts={accounts}
        categories={categories}
        api={api}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSaved={async () => {
          setEditing(null);
          await loadTransactions(undefined, true);
        }}
      />
    </section>
  );
}

function RegisterSkeleton() {
  return (
    <div className="register-skeleton" aria-label="Loading transactions">
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}
