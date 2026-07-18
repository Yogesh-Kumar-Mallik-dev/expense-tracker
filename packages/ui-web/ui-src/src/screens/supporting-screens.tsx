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
  Session,
} from "../api";
import { formatMoney, moneyRatio, parseMoney } from "../money";
import type { AppRoute } from "../shell";
import { AccountForm } from "./account-form";
import { BudgetForm } from "./budget-form";
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
  api,
  onLogout,
  diagnostics,
}: {
  session: Session;
  api: ExpenseDataClient;
  onLogout: () => Promise<void>;
  diagnostics: BrowserDiagnosticsTransport;
}) {
  const [name, setName] = useState(session.user.name ?? "");
  const [currency, setCurrency] = useState(session.user.currency);
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
    setPending(true);
    setMessage("");
    try {
      await api.updateProfile({
        name: name.trim() || null,
        currency: currency.toUpperCase(),
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
      <section className="settings-action" aria-labelledby="profile-edit-title">
        <div>
          <strong id="profile-edit-title">Profile</strong>
          <p>
            Email changes require an email-verification workflow and are not
            available.
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
          <p>
            This tombstones the account and prevents future sign-in. Local
            downloaded data removal is part of the offline composition phase.
          </p>
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
