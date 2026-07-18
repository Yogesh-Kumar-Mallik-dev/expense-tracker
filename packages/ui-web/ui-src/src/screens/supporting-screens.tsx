import { ArrowRight, LogOut, RefreshCw } from "lucide-react";
import React from "react";
import { useCallback, useEffect, useState } from "react";
import type { BrowserDiagnosticsTransport } from "@expense-tracker/logger/browser";
import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert";
import { Button } from "#components/ui/button";
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
  ExpenseDataClient,
  Session,
} from "../api";
import { formatMoney, moneyRatio, parseMoney } from "../money";
import type { AppRoute } from "../shell";

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
      <Alert>
        <AlertTitle>Monthly spending is not shown</AlertTitle>
        <AlertDescription>
          TODO: Requires a reporting-service endpoint for period spending. A
          paginated transaction page is not a valid aggregate.
        </AlertDescription>
      </Alert>
    </section>
  );
}

export function AccountsScreen({
  api,
  onUnauthorized,
}: {
  api: ExpenseDataClient;
  onUnauthorized: () => void;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [partial, setPartial] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const results = await Promise.allSettled([api.accounts(), api.balances()]);
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
  }, [api, onUnauthorized]);
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
        <Button variant="outline" type="button" onClick={() => void load()}>
          <RefreshCw /> Refresh
        </Button>
      </header>
      {partial ? (
        <Alert>
          <AlertTitle>Partial data</AlertTitle>
          <AlertDescription>{partial}</AlertDescription>
        </Alert>
      ) : null}
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
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="empty-state">
            <h2>No accounts</h2>
            <p>
              Account creation is supported by the API but is not yet
              implemented in this frontend.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export function BudgetsScreen({
  api,
  onUnauthorized,
}: {
  api: ExpenseDataClient;
  onUnauthorized: () => void;
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
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const results = await Promise.allSettled([
      api.budgets(from, to),
      api.budgetUsage(from, to),
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
        <Button variant="outline" type="button" onClick={() => void load()}>
          <RefreshCw /> Refresh
        </Button>
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
              Create and category-assignment workflows are not yet implemented
              in this frontend.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export function ReportsScreen() {
  return (
    <UnavailableScreen
      eyebrow="Reporting dependency"
      title="Reports"
      description="Reports are unavailable until reporting endpoints expose period totals, category grouping, comparisons, and drill-down transaction identifiers. Account balances and budget usage remain available on their own screens."
    />
  );
}
export function SyncScreen() {
  return (
    <UnavailableScreen
      eyebrow="Local-first dependency"
      title="Synchronization"
      description="Unavailable until the application bootstrap exposes PowerSync connection state, pending writes, last successful sync, upload failures, and permanent conflicts. No connection or sync status is inferred from loaded data."
    />
  );
}
export function SettingsScreen({
  session,
  onLogout,
  diagnostics,
}: {
  session: Session;
  onLogout: () => Promise<void>;
  diagnostics: BrowserDiagnosticsTransport;
}) {
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
      </dl>
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
    </section>
  );
}

function UnavailableScreen({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section
      className="route-screen narrow-screen"
      aria-labelledby={`${title.toLocaleLowerCase()}-title`}
    >
      <header className="route-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1 id={`${title.toLocaleLowerCase()}-title`}>{title}</h1>
        </div>
      </header>
      <Alert>
        <AlertTitle>Not available yet</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </Alert>
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
