import {
  ArrowRight,
  Archive,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
} from "lucide-react";
import React from "react";
import { useCallback, useEffect, useState } from "react";
import type { BrowserDiagnosticsTransport } from "@expense-tracker/logger/browser";
import type {
  ApplicationSyncState,
  LocalDatabaseLifecycle,
  SyncController,
} from "@expense-tracker/client-core";
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
import type {
  Account,
  AccountBalance,
  Budget,
  BudgetUsage,
  Category,
  Device,
  ExpenseDataClient,
  PeriodSpending,
  CategorySpending,
  NetWorthPoint,
  Session,
  TransactionSchedule,
  Transaction,
} from "../api";
import { formatMoney, moneyRatio, parseMoney } from "../money";
import type { AppRoute } from "../shell";
import { AccountForm } from "./account-form";
import { BudgetForm } from "./budget-form";
import { SelectField } from "./select-field";

export function SchedulesScreen({ api }: { api: ExpenseDataClient }) {
  const today = new Date();
  const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [schedules, setSchedules] = useState<TransactionSchedule[]>([]);
  const [accountId, setAccountId] = useState("");
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<"WEEKLY" | "MONTHLY" | "YEARLY">(
    "MONTHLY",
  );
  const [startsOn, setStartsOn] = useState(localDate);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const [accountResult, scheduleResult] = await Promise.all([
      api.accounts(),
      api.schedules(localDate),
    ]);
    setAccounts(accountResult.data);
    setSchedules(scheduleResult.data);
    if (!accountId && accountResult.data[0])
      setAccountId(accountResult.data[0].id);
  }, [accountId, api, localDate]);
  useEffect(
    () => void load().catch((error) => setMessage(String(error))),
    [load],
  );
  const account = accounts.find((value) => value.id === accountId);
  const save = async () => {
    if (!account || !/^\d+(?:\.\d{1,4})?$/.test(amount) || Number(amount) <= 0)
      return setMessage("Choose an account and enter a positive amount.");
    await api.createSchedule({
      accountId,
      transferAccountId: null,
      categoryId: null,
      type,
      amount,
      currency: account.currency,
      description: description.trim() || null,
      note: null,
      frequency,
      interval: 1,
      startsOn,
      endsOn: null,
    });
    setAmount("");
    setDescription("");
    setMessage("Schedule created for manual approval.");
    await load();
  };
  return (
    <section className="route-screen" aria-labelledby="schedules-title">
      <header className="route-header">
        <div>
          <p className="eyebrow">Review before posting</p>
          <h1 id="schedules-title">Schedules</h1>
          <p>Due occurrences do not affect balances until you post them.</p>
        </div>
      </header>
      <div className="form-stack">
        <SelectField
          label="Account"
          required
          value={accountId}
          onChange={setAccountId}
          options={accounts.map((value) => ({
            value: value.id,
            label: value.name,
          }))}
        />
        <SelectField
          label="Type"
          required
          value={type}
          onChange={(value) => setType(value as "EXPENSE" | "INCOME")}
          options={[
            { value: "EXPENSE", label: "Expense" },
            { value: "INCOME", label: "Income" },
          ]}
        />
        <div className="field">
          <Label htmlFor="schedule-amount">Amount</Label>
          <Input
            id="schedule-amount"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>
        <div className="field">
          <Label htmlFor="schedule-description">Description</Label>
          <Input
            id="schedule-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <SelectField
          label="Frequency"
          required
          value={frequency}
          onChange={(value) => setFrequency(value as typeof frequency)}
          options={[
            { value: "WEEKLY", label: "Weekly" },
            { value: "MONTHLY", label: "Monthly" },
            { value: "YEARLY", label: "Yearly" },
          ]}
        />
        <div className="field">
          <Label htmlFor="schedule-start">First date</Label>
          <Input
            id="schedule-start"
            type="date"
            value={startsOn}
            onChange={(event) => setStartsOn(event.target.value)}
          />
        </div>
        <Button
          type="button"
          onClick={() =>
            void save().catch((error) => setMessage(String(error)))
          }
        >
          Create schedule
        </Button>
        {message ? <p role="status">{message}</p> : null}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead>Next date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Due action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.map((schedule) => (
            <TableRow key={schedule.id}>
              <TableCell>
                {schedule.description ?? "Scheduled transaction"}
              </TableCell>
              <TableCell>{schedule.nextOccurrenceOn.slice(0, 10)}</TableCell>
              <TableCell className="money">
                {formatMoney(schedule.amount, schedule.currency)}
              </TableCell>
              <TableCell>
                {schedule.occurrences?.map((occurrence) => (
                  <span key={occurrence.id}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        void api
                          .resolveScheduleOccurrence(occurrence.id, "POSTED")
                          .then(load)
                      }
                    >
                      Post {occurrence.occurrenceDate.slice(0, 10)}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        void api
                          .resolveScheduleOccurrence(occurrence.id, "SKIPPED")
                          .then(load)
                      }
                    >
                      Skip
                    </Button>
                  </span>
                ))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

export function ReconciliationScreen({ api }: { api: ExpenseDataClient }) {
  const today = new Date();
  const financialDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statementDate, setStatementDate] = useState(financialDate);
  const [statementBalance, setStatementBalance] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    void api.accounts().then(({ data }) => {
      setAccounts(data);
      if (data[0]) setAccountId(data[0].id);
    });
  }, [api]);
  useEffect(() => {
    if (!accountId) return;
    void (async () => {
      const rows: Transaction[] = [];
      for (let page = 1; ; page += 1) {
        const result = await api.transactions({
          page,
          pageSize: 100,
          accountId,
          to: new Date(`${statementDate}T23:59:59.999`).toISOString(),
        });
        rows.push(...result.data);
        if (!result.meta?.hasNext) break;
      }
      setTransactions(rows);
      setSelected(new Set());
    })().catch((error) => setMessage(String(error)));
  }, [accountId, api, statementDate]);
  const account = accounts.find((value) => value.id === accountId);
  return (
    <section className="route-screen" aria-labelledby="reconciliation-title">
      <header className="route-header">
        <div>
          <p className="eyebrow">Match a bank statement</p>
          <h1 id="reconciliation-title">Reconciliation</h1>
          <p>
            Select only transactions confirmed on the statement. Transfers are
            reconciled independently for each account.
          </p>
        </div>
      </header>
      <div className="filter-bar">
        <SelectField
          label="Account"
          required
          value={accountId}
          onChange={setAccountId}
          options={accounts.map((value) => ({
            value: value.id,
            label: value.name,
          }))}
        />
        <div className="field">
          <Label htmlFor="statement-date">Statement date</Label>
          <Input
            id="statement-date"
            type="date"
            value={statementDate}
            onChange={(event) => setStatementDate(event.target.value)}
          />
        </div>
        <div className="field">
          <Label htmlFor="statement-balance">
            Statement balance {account ? `(${account.currency})` : ""}
          </Label>
          <Input
            id="statement-balance"
            inputMode="decimal"
            value={statementBalance}
            onChange={(event) => setStatementBalance(event.target.value)}
          />
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cleared</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>
                <input
                  type="checkbox"
                  aria-label={`Clear ${transaction.description ?? transaction.id}`}
                  checked={selected.has(transaction.id)}
                  onChange={(event) =>
                    setSelected((current) => {
                      const next = new Set(current);
                      if (event.target.checked) next.add(transaction.id);
                      else next.delete(transaction.id);
                      return next;
                    })
                  }
                />
              </TableCell>
              <TableCell>{transaction.occurredAt.slice(0, 10)}</TableCell>
              <TableCell>
                {transaction.description ?? "No description"}
              </TableCell>
              <TableCell className="money">
                {formatMoney(transaction.amount, transaction.currency)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button
        type="button"
        disabled={!accountId || !statementBalance || selected.size === 0}
        onClick={() =>
          void api
            .reconcileAccount(accountId, {
              statementDate,
              statementBalance,
              clearedTransactionIds: [...selected],
            })
            .then(() =>
              setMessage(
                "Statement reconciled and selected transactions locked.",
              ),
            )
            .catch((error) =>
              setMessage(
                error instanceof Error
                  ? error.message
                  : "Reconciliation failed.",
              ),
            )
        }
      >
        Finish reconciliation
      </Button>
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
import { BudgetManage } from "./budget-manage";

export function OverviewScreen({
  navigate,
}: {
  navigate: (route: AppRoute) => void;
}) {
  return (
    <section
      className="route-screen narrow-screen"
      aria-labelledby="overview-title"
    >
      <header className="route-header">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1 id="overview-title">Overview</h1>
          <p>
            Use the register to record transactions, then review accounts and
            budgets.
          </p>
        </div>
      </header>
      <div className="task-list">
        <button type="button" onClick={() => navigate("transactions")}>
          <span>
            <strong>Transactions</strong>
            <small>Record, filter, edit, and delete transactions.</small>
          </span>
          <ArrowRight />
        </button>
        <button type="button" onClick={() => navigate("accounts")}>
          <span>
            <strong>Accounts</strong>
            <small>
              Review account balances calculated by the reporting service.
            </small>
          </span>
          <ArrowRight />
        </button>
        <button type="button" onClick={() => navigate("budgets")}>
          <span>
            <strong>Budgets</strong>
            <small>
              Review simple spending limits and envelope availability.
            </small>
          </span>
          <ArrowRight />
        </button>
      </div>
    </section>
  );
}

export function AccountsScreen({
  api,
  onUnauthorized,
  defaultCurrency,
}: {
  api: ExpenseDataClient;
  onUnauthorized: () => void;
  defaultCurrency: string;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [partial, setPartial] = useState("");
  const [editing, setEditing] = useState<Account | "new" | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const results = await Promise.allSettled([
      api.accounts(undefined, includeArchived),
      api.balances(),
    ]);
    const [accountResult, balanceResult] = results;
    if (
      results.some(
        (result) =>
          result.status === "rejected" && result.reason?.status === 401,
      )
    )
      return onUnauthorized();
    if (accountResult.status === "fulfilled")
      setAccounts(accountResult.value.data);
    if (balanceResult.status === "fulfilled")
      setBalances(balanceResult.value.data);
    if (accountResult.status === "rejected")
      setError("Accounts could not be loaded.");
    setPartial(
      balanceResult.status === "rejected"
        ? "Balances are temporarily unavailable. Account records are still shown."
        : "",
    );
    setLoading(false);
  }, [api, includeArchived, onUnauthorized]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <section className="route-screen" aria-labelledby="accounts-title">
      <header className="route-header">
        <div>
          <p className="eyebrow">Ledger</p>
          <h1 id="accounts-title">Accounts</h1>
          <p>
            Balances include all eligible transactions, not only the current
            register page.
          </p>
        </div>
        <div className="header-actions">
          <Button variant="outline" type="button" onClick={() => void load()}>
            <RefreshCw /> Refresh
          </Button>
          <Button type="button" onClick={() => setEditing("new")}>
            <Plus /> Create account
          </Button>
        </div>
      </header>
      {partial ? (
        <Alert>
          <AlertTitle>Partial data</AlertTitle>
          <AlertDescription>{partial}</AlertDescription>
        </Alert>
      ) : null}
      <label className="toggle-row">
        <input
          type="checkbox"
          checked={includeArchived}
          onChange={(event) => setIncludeArchived(event.target.checked)}
        />{" "}
        Show archived accounts
      </label>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Accounts unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="data-panel">
        {loading ? (
          <ListSkeleton />
        ) : accounts.length ? (
          <Table>
            <caption className="sr-only">Active accounts</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="amount-cell">Current balance</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => {
                const balance = balances.find(
                  (item) => item.accountId === account.id,
                );
                return (
                  <TableRow key={account.id}>
                    <TableCell>
                      <strong>{account.name}</strong>
                      {account.isArchived ? <small>Archived</small> : null}
                    </TableCell>
                    <TableCell>
                      {account.type.replaceAll("_", " ").toLocaleLowerCase()}
                    </TableCell>
                    <TableCell>{account.currency}</TableCell>
                    <TableCell className="amount-cell">
                      {balance
                        ? formatMoney(balance.balance, balance.currency)
                        : "Unavailable"}
                    </TableCell>
                    <TableCell>
                      <div className="row-actions">
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          aria-label={`Edit ${account.name}`}
                          onClick={() => setEditing(account)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          aria-label={`${account.isArchived ? "Restore" : "Archive"} ${account.name}`}
                          onClick={() =>
                            void api
                              .updateAccount(account.id, {
                                isArchived: !account.isArchived,
                              })
                              .then(load)
                          }
                        >
                          <Archive />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="empty-state">
            <h2>No accounts</h2>
            <p>Create your first account to start recording transactions.</p>
            <Button type="button" onClick={() => setEditing("new")}>
              <Plus /> Create account
            </Button>
          </div>
        )}
      </div>
      <AccountForm
        open={editing !== null}
        account={editing === "new" ? null : editing}
        api={api}
        defaultCurrency={defaultCurrency}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSaved={load}
      />
    </section>
  );
}

export function BudgetsScreen({
  api,
  onUnauthorized,
  defaultCurrency,
}: {
  api: ExpenseDataClient;
  onUnauthorized: () => void;
  defaultCurrency: string;
}) {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const to = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [usage, setUsage] = useState<BudgetUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Budget | "new" | null>(null);
  const [managing, setManaging] = useState<Budget | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const results = await Promise.allSettled([
      api.budgets(from, to),
      api.budgetUsage(from, to),
      api.categories(),
    ]);
    if (
      results.some(
        (result) =>
          result.status === "rejected" && result.reason?.status === 401,
      )
    )
      return onUnauthorized();
    if (results[0].status === "fulfilled") setBudgets(results[0].value.data);
    if (results[1].status === "fulfilled") setUsage(results[1].value.data);
    if (results[2].status === "fulfilled") setCategories(results[2].value.data);
    if (results[0].status === "rejected")
      setError("Budgets could not be loaded.");
    setLoading(false);
  }, [api, from, onUnauthorized, to]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <section className="route-screen" aria-labelledby="budgets-title">
      <header className="route-header">
        <div>
          <p className="eyebrow">Current period</p>
          <h1 id="budgets-title">Budgets</h1>
          <p>
            {from} to {to}. Limits warn; envelopes track assigned and available
            money.
          </p>
        </div>
        <div className="header-actions">
          <Button variant="outline" type="button" onClick={() => void load()}>
            <RefreshCw /> Refresh
          </Button>
          <Button type="button" onClick={() => setEditing("new")}>
            <Plus /> Create budget
          </Button>
        </div>
      </header>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Budgets unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="data-panel">
        {loading ? (
          <ListSkeleton />
        ) : budgets.length ? (
          <Table>
            <caption className="sr-only">
              Budgets active during the current period
            </caption>
            <TableHeader>
              <TableRow>
                <TableHead>Budget</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Rollover</TableHead>
                <TableHead className="amount-cell">Assigned or limit</TableHead>
                <TableHead className="amount-cell">Activity</TableHead>
                <TableHead className="amount-cell">
                  Available or remaining
                </TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgets.map((budget) => {
                const value = usage.find((item) => item.budgetId === budget.id);
                const available =
                  budget.mode === "ENVELOPE"
                    ? value?.available
                    : value?.remaining;
                const exceeded = available ? parseMoney(available) < 0n : false;
                return (
                  <TableRow key={budget.id}>
                    <TableCell>
                      <strong>{budget.name}</strong>
                      <small>
                        {budget.startsOn}–{budget.endsOn}
                      </small>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => setManaging(budget)}
                      >
                        Manage
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        aria-label={`Edit ${budget.name}`}
                        onClick={() => setEditing(budget)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        aria-label={`Delete ${budget.name}`}
                        onClick={() =>
                          window.confirm(`Delete ${budget.name}?`) &&
                          void api.deleteBudget(budget.id).then(load)
                        }
                      >
                        <Archive />
                      </Button>
                    </TableCell>
                    <TableCell>
                      {budget.mode === "ENVELOPE"
                        ? "Envelope"
                        : "Spending limit"}
                    </TableCell>
                    <TableCell>
                      {budget.rolloverPolicy
                        .replaceAll("_", " ")
                        .toLocaleLowerCase()}
                    </TableCell>
                    <TableCell className="amount-cell">
                      {formatMoney(
                        budget.mode === "ENVELOPE"
                          ? (value?.assigned ?? "0")
                          : budget.amount,
                        budget.currency,
                      )}
                    </TableCell>
                    <TableCell className="amount-cell">
                      {value
                        ? formatMoney(value.spent, budget.currency)
                        : "Unavailable"}
                    </TableCell>
                    <TableCell
                      className={`amount-cell ${exceeded ? "amount-expense" : ""}`}
                    >
                      {available
                        ? formatMoney(available, budget.currency)
                        : "Unavailable"}
                      {budget.mode === "SPENDING_LIMIT" && value ? (
                        <small>
                          {Math.max(0, moneyRatio(value.spent, budget.amount))}%
                          used
                        </small>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="empty-state">
            <h2>No budgets in this period</h2>
            <p>
              Create a spending limit or an envelope budget for this period.
            </p>
            <Button type="button" onClick={() => setEditing("new")}>
              <Plus /> Create budget
            </Button>
          </div>
        )}
      </div>
      <BudgetForm
        open={editing !== null}
        budget={editing === "new" ? null : editing}
        api={api}
        currency={defaultCurrency}
        period={{ from, to }}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSaved={load}
      />
      <BudgetManage
        open={managing !== null}
        budget={managing}
        categories={categories}
        api={api}
        onOpenChange={(open) => {
          if (!open) setManaging(null);
        }}
        onChanged={load}
      />
    </section>
  );
}

export function ReportsScreen({ api }: { api: ExpenseDataClient }) {
  const today = new Date();
  const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const localDate = (value: Date) =>
    `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  const [from, setFrom] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`,
  );
  const [to, setTo] = useState(localDate(today));
  const [compareFrom, setCompareFrom] = useState(localDate(previousMonth));
  const [compareTo, setCompareTo] = useState(localDate(previousMonthEnd));
  const [periods, setPeriods] = useState<PeriodSpending[]>([]);
  const [comparison, setComparison] = useState<PeriodSpending[]>([]);
  const [categoryRows, setCategoryRows] = useState<CategorySpending[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [netWorth, setNetWorth] = useState<NetWorthPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const start = new Date(`${from}T00:00:00`).toISOString();
      const end = new Date(`${to}T23:59:59.999`).toISOString();
      const comparisonStart = new Date(`${compareFrom}T00:00:00`).toISOString();
      const comparisonEnd = new Date(`${compareTo}T23:59:59.999`).toISOString();
      const [period, previous, category, reference, history] =
        await Promise.all([
          api.periodSpending(start, end),
          api.periodSpending(comparisonStart, comparisonEnd),
          api.categorySpending(start, end),
          api.categories(),
          api.netWorthHistory(from, to),
        ]);
      setPeriods(period.data);
      setComparison(previous.data);
      setCategoryRows(category.data);
      setCategories(reference.data);
      setNetWorth(history.data);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Reports could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [api, compareFrom, compareTo, from, to]);
  useEffect(() => void load(), [load]);
  return (
    <section className="route-screen" aria-labelledby="reports-title">
      <header className="route-header">
        <div>
          <p className="eyebrow">Computed from source records</p>
          <h1 id="reports-title">Reports</h1>
          <p>Review income and spending for an explicit period.</p>
        </div>
      </header>
      <div className="filter-bar">
        <Label htmlFor="report-from">From</Label>
        <Input
          id="report-from"
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
        />
        <Label htmlFor="report-to">To</Label>
        <Input
          id="report-to"
          type="date"
          value={to}
          onChange={(event) => setTo(event.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => void load()}
        >
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>
      <details className="filters">
        <summary>Comparison period</summary>
        <div className="filter-grid">
          <div className="field">
            <Label htmlFor="comparison-from">From</Label>
            <Input
              id="comparison-from"
              type="date"
              value={compareFrom}
              onChange={(event) => setCompareFrom(event.target.value)}
            />
          </div>
          <div className="field">
            <Label htmlFor="comparison-to">To</Label>
            <Input
              id="comparison-to"
              type="date"
              value={compareTo}
              onChange={(event) => setCompareTo(event.target.value)}
            />
          </div>
        </div>
      </details>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Reports unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {!loading && !error && periods.length === 0 ? (
        <Alert>
          <AlertTitle>No reportable transactions</AlertTitle>
          <AlertDescription>
            No income or expenses exist in this period. Transfers are excluded.
          </AlertDescription>
        </Alert>
      ) : null}
      {periods.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Currency</TableHead>
              <TableHead>Income</TableHead>
              <TableHead>Expenses</TableHead>
              <TableHead>Net</TableHead>
              <TableHead>Transactions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.map((row) => (
              <TableRow key={row.currency}>
                <TableCell>{row.currency}</TableCell>
                <TableCell className="money">
                  {formatMoney(row.income, row.currency)}
                </TableCell>
                <TableCell className="money">
                  {formatMoney(row.expenses, row.currency)}
                </TableCell>
                <TableCell className="money">
                  {formatMoney(row.net, row.currency)}
                </TableCell>
                <TableCell>{row.transactionCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
      {comparison.length ? (
        <>
          <h2>Comparison period</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Currency</TableHead>
                <TableHead>Income</TableHead>
                <TableHead>Expenses</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Transactions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparison.map((row) => (
                <TableRow key={row.currency}>
                  <TableCell>{row.currency}</TableCell>
                  <TableCell className="money">
                    {formatMoney(row.income, row.currency)}
                  </TableCell>
                  <TableCell className="money">
                    {formatMoney(row.expenses, row.currency)}
                  </TableCell>
                  <TableCell className="money">
                    {formatMoney(row.net, row.currency)}
                  </TableCell>
                  <TableCell>{row.transactionCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      ) : null}
      {netWorth.length ? (
        <details>
          <summary>Net-worth history</summary>
          <p>
            Balances are kept separate by currency and are calculated from
            opening balances and posted transactions through each date.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {netWorth.map((row) => (
                <TableRow key={`${row.date}:${row.currency}`}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{row.currency}</TableCell>
                  <TableCell className="money">
                    {formatMoney(row.balance, row.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </details>
      ) : null}
      {categoryRows.length ? (
        <>
          <h2>Expenses by category</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Spent</TableHead>
                <TableHead>Transactions</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoryRows.map((row) => (
                <TableRow key={`${row.categoryId}:${row.currency}`}>
                  <TableCell>
                    {categories.find((value) => value.id === row.categoryId)
                      ?.name ?? "Uncategorized"}
                  </TableCell>
                  <TableCell>{row.currency}</TableCell>
                  <TableCell className="money">
                    {formatMoney(row.amount, row.currency)}
                  </TableCell>
                  <TableCell>{row.transactionCount}</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        window.location.hash = `/transactions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${row.categoryId ? `&categoryId=${encodeURIComponent(row.categoryId)}` : ""}`;
                      }}
                    >
                      View register
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      ) : null}
    </section>
  );
}
export function SyncScreen({ sync }: { sync: SyncController }) {
  const [state, setState] = useState<ApplicationSyncState>(
    () =>
      sync.state?.() ?? {
        status: "not-configured",
        lastSyncedAt: null,
        pendingWrites: null,
        error: null,
      },
  );
  useEffect(() => sync.subscribe?.(setState), [sync]);
  return (
    <section
      className="route-screen narrow-screen"
      aria-labelledby="synchronization-title"
    >
      <header className="route-header">
        <div>
          <p className="eyebrow">Local-first runtime</p>
          <h1 id="synchronization-title">Synchronization</h1>
          <p>
            Local data remains available when the API or PowerSync service
            cannot be reached.
          </p>
        </div>
      </header>
      <dl className="settings-list">
        <div>
          <dt>Status</dt>
          <dd>{state.status.replace("-", " ")}</dd>
        </div>
        <div>
          <dt>Last synchronized</dt>
          <dd>
            {state.lastSyncedAt
              ? new Intl.DateTimeFormat(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(state.lastSyncedAt))
              : "Not yet synchronized"}
          </dd>
        </div>
        <div>
          <dt>Pending attachment uploads</dt>
          <dd>{state.pendingWrites ?? "Queue count unavailable"}</dd>
        </div>
      </dl>
      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>Synchronization failed</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state.status === "not-configured" ? (
        <Alert>
          <AlertTitle>PowerSync is not configured</AlertTitle>
          <AlertDescription>
            Local SQLite remains usable. Configure the PowerSync URL and signing
            key to synchronize devices.
          </AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}
export function SettingsScreen({
  session,
  api,
  onLogout,
  diagnostics,
  localDatabase,
}: {
  session: Session;
  api: ExpenseDataClient;
  onLogout: () => Promise<void>;
  diagnostics: BrowserDiagnosticsTransport;
  localDatabase: LocalDatabaseLifecycle;
}) {
  const [name, setName] = useState(session.user.name ?? "");
  const [currency, setCurrency] = useState(session.user.currency);
  const [timezone, setTimezone] = useState(session.user.timezone);
  const [email, setEmail] = useState(session.user.email);
  const [devices, setDevices] = useState<Device[]>([]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const loadDevices = useCallback(
    () => api.devices().then((result) => setDevices(result.data)),
    [api],
  );
  useEffect(() => {
    void loadDevices().catch(() => setMessage("Devices could not be loaded."));
  }, [loadDevices]);
  const saveProfile = async () => {
    if (!/^[A-Za-z]{3}$/.test(currency))
      return setMessage("Currency must be a three-letter code.");
    try {
      new Intl.DateTimeFormat("en", { timeZone: timezone });
    } catch {
      return setMessage("Enter a valid IANA timezone, such as Asia/Kolkata.");
    }
    setPending(true);
    setMessage("");
    try {
      await api.updateProfile({
        name: name.trim() || null,
        currency: currency.toUpperCase(),
        timezone,
      });
      setMessage(
        "Profile saved. Updated defaults apply after session refresh.",
      );
    } catch (caught) {
      setMessage(
        caught instanceof Error
          ? caught.message
          : "Profile could not be saved.",
      );
    } finally {
      setPending(false);
    }
  };
  const verifyEmail = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return setMessage("Enter a valid email address.");
    setPending(true);
    setMessage("");
    try {
      const result = await api.requestEmailChange(email);
      setMessage(
        result.data.delivery === "email"
          ? "Verification email sent."
          : "Development verification link is ready.",
      );
      if (result.data.developmentVerificationUrl)
        window.open(
          result.data.developmentVerificationUrl,
          "_blank",
          "noopener,noreferrer",
        );
    } catch (caught) {
      setMessage(
        caught instanceof Error
          ? caught.message
          : "Verification could not be started.",
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <section
      className="route-screen narrow-screen"
      aria-labelledby="settings-title"
    >
      <header className="route-header">
        <div>
          <p className="eyebrow">Account</p>
          <h1 id="settings-title">Settings</h1>
          <p>Profile and session controls.</p>
        </div>
      </header>
      <dl className="settings-list">
        <div>
          <dt>Name</dt>
          <dd>{session.user.name ?? "Not set"}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{session.user.email}</dd>
        </div>
        <div>
          <dt>Default currency</dt>
          <dd>{session.user.currency}</dd>
        </div>
        <div>
          <dt>Financial timezone</dt>
          <dd>{session.user.timezone}</dd>
        </div>
      </dl>
      <section className="settings-action" aria-labelledby="profile-edit-title">
        <div>
          <strong id="profile-edit-title">Profile</strong>
          <p>
            Email changes require a time-limited verification link and revoke
            existing refresh sessions after confirmation.
          </p>
        </div>
        <div className="form-stack">
          <div className="field">
            <Label htmlFor="profile-name">Name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
            />
          </div>
          <div className="field">
            <Label htmlFor="profile-timezone">Financial timezone</Label>
            <Input
              id="profile-timezone"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              placeholder="Asia/Kolkata"
            />
            <small>
              Scheduled financial dates are posted using this IANA timezone.
            </small>
          </div>
          <div className="field">
            <Label htmlFor="profile-email">Email</Label>
            <Input
              id="profile-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <small>
              Your address changes only after you open the verification link.
            </small>
          </div>
          <div className="field">
            <Label htmlFor="profile-currency">Default currency</Label>
            <Input
              id="profile-currency"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              maxLength={3}
            />
          </div>
          <Button
            type="button"
            disabled={pending}
            onClick={() => void saveProfile()}
          >
            {pending ? "Saving…" : "Save profile"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending || email === session.user.email}
            onClick={() => void verifyEmail()}
          >
            Verify new email
          </Button>
          {message ? <p role="status">{message}</p> : null}
        </div>
      </section>
      <section className="settings-action" aria-labelledby="devices-title">
        <div>
          <strong id="devices-title">Devices</strong>
          <p>
            Remove devices that should no longer be associated with this
            account.
          </p>
        </div>
        <div className="device-list">
          {devices.map((device) => (
            <div key={device.id}>
              <span>
                <strong>{device.name}</strong>
                <small>
                  {device.platform.toLocaleLowerCase()} · last seen{" "}
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: "medium",
                  }).format(new Date(device.lastSeenAt))}
                </small>
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  window.confirm(`Remove ${device.name}?`) &&
                  void api.deleteDevice(device.id).then(loadDevices)
                }
              >
                Remove
              </Button>
            </div>
          ))}
          {!devices.length ? <p>No registered devices were returned.</p> : null}
        </div>
      </section>
      <Alert>
        <AlertTitle>Session storage</AlertTitle>
        <AlertDescription>
          Refresh credentials are kept outside UI state: in an HttpOnly cookie
          on web and the operating-system credential vault on desktop. Access
          credentials remain in memory.
        </AlertDescription>
      </Alert>
      <div className="settings-action">
        <div>
          <strong>Financial data backup</strong>
          <p>
            Export a versioned snapshot of server financial records. Attachment
            bytes and authentication credentials are not included.
          </p>
        </div>
        <Button
          variant="outline"
          type="button"
          disabled={pending}
          onClick={() => {
            setPending(true);
            void api
              .exportBackup()
              .then((backup) => {
                const url = URL.createObjectURL(
                  new Blob([JSON.stringify(backup.data, null, 2)], {
                    type: "application/json",
                  }),
                );
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = `expense-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
                anchor.click();
                URL.revokeObjectURL(url);
                setMessage("Backup exported.");
              })
              .catch((caught) =>
                setMessage(
                  caught instanceof Error
                    ? caught.message
                    : "Backup could not be exported.",
                ),
              )
              .finally(() => setPending(false));
          }}
        >
          Export backup
        </Button>
        <div className="field">
          <Label htmlFor="restore-backup">
            Restore into a separate dataset
          </Label>
          <Input
            id="restore-backup"
            type="file"
            accept="application/json,.json"
            disabled={pending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setPending(true);
              void file
                .text()
                .then((text) =>
                  api.stageRestore(
                    file.name.replace(/\.json$/i, ""),
                    JSON.parse(text),
                  ),
                )
                .then((result) =>
                  setMessage(
                    `Backup validated as “${result.data.name}”. The active synchronized data was not overwritten.`,
                  ),
                )
                .catch((caught) =>
                  setMessage(
                    caught instanceof Error
                      ? caught.message
                      : "Backup could not be validated.",
                  ),
                )
                .finally(() => setPending(false));
            }}
          />
          <small>
            Restores are staged separately so other devices cannot overwrite or
            resurrect records in the active dataset.
          </small>
        </div>
      </div>
      <div className="settings-action">
        <div>
          <strong>Diagnostic logs</strong>
          <p>
            Export this session’s structured client logs as JSONL for
            troubleshooting. Tokens, passwords, request bodies, and SQL are
            excluded by the logger.
          </p>
        </div>
        <Button
          variant="outline"
          type="button"
          onClick={() => diagnostics.download()}
        >
          Export diagnostic logs
        </Button>
      </div>
      <Button variant="outline" type="button" onClick={() => void onLogout()}>
        <LogOut /> Sign out
      </Button>
      <section
        className="settings-action destructive-zone"
        aria-labelledby="delete-account-title"
      >
        <div>
          <strong id="delete-account-title">Delete account</strong>
          <p>This tombstones the account and prevents future sign-in.</p>
        </div>
        <Button
          variant="outline"
          type="button"
          onClick={() => {
            if (
              !window.confirm(
                "Delete your account? This action cannot be undone.",
              )
            )
              return;
            void api
              .deleteProfile()
              .then(onLogout)
              .catch((caught) =>
                setMessage(
                  caught instanceof Error
                    ? caught.message
                    : "Account could not be deleted.",
                ),
              );
          }}
        >
          Delete account
        </Button>
      </section>
      <section className="settings-action" aria-labelledby="remove-local-title">
        <div>
          <strong id="remove-local-title">Remove downloaded data</strong>
          <p>
            Disconnects synchronization and clears this user’s local SQLite data
            from this device. Server records are not deleted.
          </p>
        </div>
        <Button
          variant="outline"
          type="button"
          onClick={() => {
            if (
              !window.confirm(
                "Remove downloaded data from this device and sign out?",
              )
            )
              return;
            void localDatabase
              .remove(session.user.id)
              .then(onLogout)
              .catch((caught) =>
                setMessage(
                  caught instanceof Error
                    ? caught.message
                    : "Local data could not be removed.",
                ),
              );
          }}
        >
          Remove local data
        </Button>
      </section>
    </section>
  );
}

function ListSkeleton() {
  return (
    <div className="register-skeleton" aria-label="Loading">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}
