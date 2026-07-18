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
  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    pageSize: 25,
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [referenceError, setReferenceError] = useState("");
  const [editing, setEditing] = useState<Transaction | "new" | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
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

  const visibleTransactions = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return transactions;
    return transactions.filter((transaction) => {
      const account =
        accounts.find((item) => item.id === transaction.accountId)?.name ?? "";
      const category =
        categories.find((item) => item.id === transaction.categoryId)?.name ??
        "";
      return [
        transaction.description,
        transaction.note,
        account,
        category,
        transaction.amount,
      ].some((value) => value?.toLocaleLowerCase().includes(term));
    });
  }, [accounts, categories, search, transactions]);

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
            Create an account before recording a transaction.
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

      <div className="register">
        <div className="register-toolbar">
          <div className="page-search">
            <Search aria-hidden="true" />
            <Label className="sr-only" htmlFor="transaction-search">
              Search transactions on this page
            </Label>
            <Input
              id="transaction-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search this page"
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
