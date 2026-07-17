"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Target,
  WalletCards,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import type { AccountRecord } from "@expense-tracker/services/account";
import { ApiError, ExpenseApi, type DashboardData, type Session } from "./api";
import { Badge, Button, Frame, FrameHeader } from "./reui";

export function ExpenseApp({
  apiBaseUrl = "http://localhost:3001",
  platform = "web",
}: {
  apiBaseUrl?: string;
  platform?: "web" | "desktop";
}) {
  const [session, setSession] = useState<Session | null>(() =>
    stored("et.session"),
  );
  const api = useMemo(
    () => new ExpenseApi(apiBaseUrl, () => session?.tokens.accessToken ?? null),
    [apiBaseUrl, session],
  );
  if (!session)
    return (
      <Login
        api={api}
        onLogin={(value) => {
          setSession(value);
          save("et.session", value);
        }}
      />
    );
  return (
    <Dashboard
      api={api}
      session={session}
      platform={platform}
      onLogout={() => {
        setSession(null);
        localStorage.removeItem("et.session");
      }}
    />
  );
}

function Login({
  api,
  onLogin,
}: {
  api: ExpenseApi;
  onLogin: (value: Session) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      onLogin((await api.login(email, password)).data);
    } catch (caught) {
      setError(message(caught));
    }
  };
  return (
    <main className="et-login">
      <section className="et-login-copy">
        <CircleDollarSign size={34} />
        <p>EXPENSE TRACKER</p>
        <h1>Make every number feel simple.</h1>
        <span>Balances, budgets, and spending—clear across every device.</span>
      </section>
      <Frame className="et-login-card">
        <FrameHeader
          title="Welcome back"
          description="Sign in to open your financial workspace."
        />
        <form onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <div className="et-error">{error}</div>}
          <Button className="is-primary">Sign in</Button>
        </form>
      </Frame>
    </main>
  );
}

function Dashboard({
  api,
  session,
  platform,
  onLogout,
}: {
  api: ExpenseApi;
  session: Session;
  platform: "web" | "desktop";
  onLogout: () => void;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [page, setPage] = useState(1);
  const [view, setView] = useState("Overview");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState(false);
  const [composer, setComposer] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await api.dashboard(page));
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) onLogout();
      else setError(message(caught));
    } finally {
      setLoading(false);
    }
  }, [api, onLogout, page]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <div className="et-shell">
      <aside className={menu ? "is-open" : ""}>
        <div className="et-brand">
          <CircleDollarSign />
          <strong>Expense Tracker</strong>
          <button onClick={() => setMenu(false)}>
            <X />
          </button>
        </div>
        <nav>
          {[
            [LayoutDashboard, "Overview"],
            [ReceiptText, "Transactions"],
            [WalletCards, "Accounts"],
            [Target, "Budgets"],
          ].map(([Icon, label]) => {
            const C = Icon as typeof LayoutDashboard;
            const text = String(label);
            return (
              <button
                key={text}
                className={view === text ? "is-active" : ""}
                onClick={() => setView(text)}
              >
                <C size={18} />
                {text}
              </button>
            );
          })}
        </nav>
        <button className="et-user" onClick={onLogout}>
          <span>
            {(session.user.name ?? session.user.email)[0]?.toUpperCase()}
          </span>
          <div>
            <strong>{session.user.name ?? "Your account"}</strong>
            <small>{session.user.email}</small>
          </div>
          <LogOut size={16} />
        </button>
      </aside>
      <main>
        <header className="et-topbar">
          <button className="et-menu" onClick={() => setMenu(true)}>
            <Menu />
          </button>
          <div>
            <small>{platform} / dashboard</small>
            <h1>{view}</h1>
          </div>
          <label className="et-search">
            <Search size={17} />
            <input placeholder="Search transactions" />
          </label>
          <button className="et-icon">
            <Bell size={18} />
          </button>
          <Button className="is-primary" onClick={() => setComposer(true)}>
            <Plus size={17} /> Add transaction
          </Button>
        </header>
        <div className="et-content">
          <div className="et-status">
            <i /> Backend connected{" "}
            <button onClick={() => void load()}>
              <RefreshCw className={loading ? "spin" : ""} />
            </button>
          </div>
          {error && <div className="et-error">{error}</div>}
          {!data ? (
            <div className="et-loading">Loading your workspace…</div>
          ) : (
            <>
              <Stats data={data} currency={session.user.currency} />
              <Accounts data={data} />
              <Transactions data={data} page={page} setPage={setPage} />
              <Budgets data={data} api={api} saved={load} />
            </>
          )}
        </div>
      </main>
      {composer && data && (
        <Composer
          api={api}
          accounts={data.accounts}
          close={() => setComposer(false)}
          saved={async () => {
            setComposer(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

function Stats({ data, currency }: { data: DashboardData; currency: string }) {
  const total = data.balances
    .filter((x) => x.currency === currency)
    .reduce((a, b) => a + Number(b.balance), 0);
  const expense = data.transactions
    .filter((x) => x.type === "EXPENSE" && x.currency === currency)
    .reduce((a, b) => a + Number(b.amount), 0);
  return (
    <section className="et-stats">
      <Stat
        label="Total balance"
        value={money(total, currency)}
        icon={<CircleDollarSign />}
        featured
      />
      <Stat
        label="Monthly spending"
        value={money(expense, currency)}
        icon={<ArrowUpRight />}
      />
      <Stat
        label="Active accounts"
        value={String(data.accounts.length)}
        icon={<CreditCard />}
      />
      <Stat
        label="Budgets"
        value={String(data.budgets.length)}
        icon={<Target />}
      />
    </section>
  );
}
function Stat({
  label,
  value,
  icon,
  featured,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <article className={featured ? "et-stat is-featured" : "et-stat"}>
      <span>
        {label}
        {icon}
      </span>
      <strong>{value}</strong>
      <small>Live from your service layer</small>
    </article>
  );
}
function Accounts({ data }: { data: DashboardData }) {
  return (
    <section className="et-accounts">
      {data.accounts.slice(0, 3).map((account) => (
        <article key={account.id}>
          <span style={{ background: account.color ?? undefined }}>
            <CreditCard />
          </span>
          <div>
            <small>{account.name}</small>
            <strong>
              {money(
                Number(
                  data.balances.find((x) => x.accountId === account.id)
                    ?.balance ?? account.openingBalance,
                ),
                account.currency,
              )}
            </strong>
          </div>
          <Badge tone="success">{account.type.replace("_", " ")}</Badge>
        </article>
      ))}
    </section>
  );
}
function Transactions({
  data,
  page,
  setPage,
}: {
  data: DashboardData;
  page: number;
  setPage: (n: number) => void;
}) {
  return (
    <Frame>
      <FrameHeader
        title="Recent transactions"
        description={`${data.transactionMeta.total} total records`}
        action={<Badge>Server paginated</Badge>}
      />
      <div className="et-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Transaction</th>
              <th>Account</th>
              <th>Date</th>
              <th>Status</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.transactions.map((tx) => (
              <tr key={tx.id}>
                <td>
                  <div className="et-tx">
                    <span>
                      {tx.type === "INCOME" ? (
                        <ArrowDownLeft />
                      ) : (
                        <ArrowUpRight />
                      )}
                    </span>
                    <div>
                      <strong>{tx.description || "Untitled"}</strong>
                      <small>{tx.type.toLowerCase()}</small>
                    </div>
                  </div>
                </td>
                <td>
                  {data.accounts.find((x) => x.id === tx.accountId)?.name ??
                    "Unknown"}
                </td>
                <td>{new Date(tx.occurredAt).toLocaleDateString()}</td>
                <td>
                  <Badge tone="success">Synced</Badge>
                </td>
                <td className={tx.type === "INCOME" ? "income" : "expense"}>
                  {tx.type === "INCOME" ? "+" : "-"}
                  {money(Number(tx.amount), tx.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="et-pager">
        <span>
          Page {data.transactionMeta.page} of{" "}
          {Math.max(1, data.transactionMeta.totalPages)}
        </span>
        <div>
          <button
            disabled={!data.transactionMeta.hasPrevious}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft />
          </button>
          <button
            disabled={!data.transactionMeta.hasNext}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight />
          </button>
        </div>
      </footer>
    </Frame>
  );
}
function Budgets({
  data,
  api,
  saved,
}: {
  data: DashboardData;
  api: ExpenseApi;
  saved: () => Promise<void>;
}) {
  const [converting, setConverting] = useState<string | null>(null);
  const convert = async (id: string) => {
    setConverting(id);
    try {
      const preview = (await api.previewBudgetConversion(id)).data;
      const accepted = window.confirm(
        `Create a new ${preview.to === "ENVELOPE" ? "envelope" : "spending-limit"} plan? ${preview.warnings.join(" ")}`,
      );
      if (accepted) {
        await api.convertBudget(id);
        await saved();
      }
    } finally {
      setConverting(null);
    }
  };
  return (
    <Frame>
      <FrameHeader
        title="Budget health"
        description="Simple limits warn; envelopes track money available."
      />
      <div className="et-budgets">
        {data.budgets.map((b) => {
          const u = data.budgetUsage.find((x) => x.budgetId === b.id);
          const spent = u?.spent ?? "0";
          const p = percentage(spent, b.amount);
          const envelope = b.mode === "ENVELOPE";
          const remaining = envelope
            ? (u?.available ?? "0")
            : (u?.remaining ?? b.amount);
          return (
            <article key={b.id}>
              <div>
                <strong>{b.name}</strong>
                <small>
                  {envelope
                    ? `${moneyString(remaining, b.currency)} available`
                    : `${moneyString(spent, b.currency)} of ${moneyString(b.amount, b.currency)}`}
                </small>
              </div>
              <span className="et-progress">
                <i style={{ width: `${Math.min(100, p)}%` }} />
              </span>
              <button
                type="button"
                disabled={converting === b.id}
                onClick={() => void convert(b.id)}
                aria-label={`Convert ${b.name} budget mode`}
              >
                <Badge
                  tone={
                    !envelope && isNegative(remaining) ? "warning" : "neutral"
                  }
                >
                  {converting === b.id
                    ? "Converting…"
                    : envelope
                      ? "Envelope"
                      : `${p}%`}
                </Badge>
              </button>
            </article>
          );
        })}
      </div>
    </Frame>
  );
}
function Composer({
  api,
  accounts,
  close,
  saved,
}: {
  api: ExpenseApi;
  accounts: AccountRecord[];
  close: () => void;
  saved: () => Promise<void>;
}) {
  const [accountId, setAccount] = useState(accounts[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [error, setError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const account = accounts.find((x) => x.id === accountId);
    if (!account) return;
    try {
      await api.createTransaction({
        accountId,
        type,
        amount,
        currency: account.currency,
        description,
      });
      await saved();
    } catch (c) {
      setError(message(c));
    }
  };
  return (
    <div className="et-modal-bg">
      <Frame className="et-modal">
        <FrameHeader
          title="Add transaction"
          description="Validated by the shared domain service."
          action={
            <button onClick={close}>
              <X />
            </button>
          }
        />
        <form onSubmit={submit}>
          <label>
            Account
            <select
              value={accountId}
              onChange={(e) => setAccount(e.target.value)}
            >
              {accounts.map((a) => (
                <option value={a.id} key={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Type
            <select
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
            >
              <option>EXPENSE</option>
              <option>INCOME</option>
            </select>
          </label>
          <label>
            Amount
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              pattern="\\d+(\\.\\d{1,4})?"
              required
            />
          </label>
          <label>
            Description
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </label>
          {error && <div className="et-error">{error}</div>}
          <div className="et-actions">
            <Button onClick={close}>Cancel</Button>
            <Button className="is-primary">Save transaction</Button>
          </div>
        </form>
      </Frame>
    </div>
  );
}
function stored<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") as T | null;
  } catch {
    return null;
  }
}
function save(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}
function money(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}
function minor(value: string) {
  const [whole = "0", fraction = ""] = value.replace("-", "").split(".");
  const result =
    BigInt(whole) * 10000n + BigInt(fraction.padEnd(4, "0").slice(0, 4));
  return value.startsWith("-") ? -result : result;
}
function percentage(value: string, total: string) {
  const denominator = minor(total);
  return denominator <= 0n ? 0 : Number((minor(value) * 100n) / denominator);
}
function isNegative(value: string) {
  return minor(value) < 0n;
}
function moneyString(value: string, currency: string) {
  const units = minor(value);
  const absolute = units < 0n ? -units : units;
  const fraction = (absolute % 10000n).toString().padStart(4, "0").slice(0, 2);
  const decimal = `${units < 0n ? "-" : ""}${absolute / 10000n}.${fraction}`;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .formatToParts(0)
    .map((part) =>
      part.type === "integer"
        ? decimal
        : part.type === "decimal" || part.type === "fraction"
          ? ""
          : part.value,
    )
    .join("");
}
function message(error: unknown) {
  return error instanceof ApiError
    ? `${error.message}${error.correlationId ? ` (${error.correlationId})` : ""}`
    : error instanceof Error
      ? error.message
      : "Unexpected error";
}
