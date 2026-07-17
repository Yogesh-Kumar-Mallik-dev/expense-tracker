import {
  BookOpen,
  ChartNoAxesColumn,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  RefreshCw,
  Settings,
  SlidersHorizontal,
  X,
} from "lucide-react";
import React from "react";
import { useEffect, useState } from "react";
import { Button } from "#components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "#components/ui/tooltip";
import type { ExpenseApi, Session } from "./api";
import {
  AccountsScreen,
  BudgetsScreen,
  OverviewScreen,
  ReportsScreen,
  SettingsScreen,
  SyncScreen,
} from "./screens/supporting-screens";
import { TransactionsScreen } from "./screens/transactions-screen";

export type AppRoute =
  | "overview"
  | "transactions"
  | "accounts"
  | "budgets"
  | "reports"
  | "sync"
  | "settings";
const routes: Array<{
  route: AppRoute;
  label: string;
  icon: typeof ReceiptText;
}> = [
  { route: "transactions", label: "Transactions", icon: ReceiptText },
  { route: "accounts", label: "Accounts", icon: Landmark },
  { route: "budgets", label: "Budgets", icon: SlidersHorizontal },
  { route: "reports", label: "Reports", icon: ChartNoAxesColumn },
  { route: "sync", label: "Synchronization", icon: RefreshCw },
  { route: "settings", label: "Settings", icon: Settings },
];

function routeFromHash(): AppRoute {
  const route = globalThis.location?.hash.replace(/^#\//, "") as AppRoute;
  return ["overview", ...routes.map((item) => item.route)].includes(route)
    ? route
    : "transactions";
}

export function AppShell({
  api,
  session,
  platform,
  onUnauthorized,
  onLogout,
}: {
  api: ExpenseApi;
  session: Session;
  platform: "web" | "desktop";
  onUnauthorized: () => void;
  onLogout: () => Promise<void>;
}) {
  const [route, setRoute] = useState<AppRoute>(routeFromHash);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const update = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", update);
    if (!window.location.hash)
      window.history.replaceState(null, "", "#/transactions");
    return () => window.removeEventListener("hashchange", update);
  }, []);

  const navigate = (next: AppRoute) => {
    window.location.hash = `/${next}`;
    setMenuOpen(false);
  };

  return (
    <TooltipProvider>
      <div className="app-shell">
        <aside
          className={menuOpen ? "app-nav is-open" : "app-nav"}
          aria-label="Primary"
        >
          <div className="product-mark">
            <BookOpen aria-hidden="true" />
            <span>Expense Tracker</span>
            <Button
              className="nav-close"
              variant="ghost"
              size="icon"
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close navigation"
            >
              <X />
            </Button>
          </div>
          <nav>
            <button
              type="button"
              onClick={() => navigate("overview")}
              aria-current={route === "overview" ? "page" : undefined}
            >
              <LayoutDashboard aria-hidden="true" /> Overview
            </button>
            {routes.map(({ route: destination, label, icon: Icon }) => (
              <button
                key={destination}
                type="button"
                onClick={() => navigate(destination)}
                aria-current={route === destination ? "page" : undefined}
              >
                <Icon aria-hidden="true" /> {label}
              </button>
            ))}
          </nav>
          <div className="nav-account">
            <span>{session.user.name ?? session.user.email}</span>
            <small>{platform}</small>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() => void onLogout()}
                    aria-label="Sign out"
                  />
                }
              >
                <LogOut />
              </TooltipTrigger>
              <TooltipContent>Sign out</TooltipContent>
            </Tooltip>
          </div>
        </aside>
        <main className="workspace">
          <div className="mobile-bar">
            <Button
              variant="outline"
              size="icon"
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation"
            >
              <Menu />
            </Button>
            <strong>Expense Tracker</strong>
          </div>
          {route === "transactions" ? (
            <TransactionsScreen api={api} onUnauthorized={onUnauthorized} />
          ) : null}
          {route === "accounts" ? (
            <AccountsScreen api={api} onUnauthorized={onUnauthorized} />
          ) : null}
          {route === "budgets" ? (
            <BudgetsScreen api={api} onUnauthorized={onUnauthorized} />
          ) : null}
          {route === "reports" ? <ReportsScreen /> : null}
          {route === "sync" ? <SyncScreen /> : null}
          {route === "settings" ? (
            <SettingsScreen session={session} onLogout={onLogout} />
          ) : null}
          {route === "overview" ? <OverviewScreen navigate={navigate} /> : null}
        </main>
      </div>
    </TooltipProvider>
  );
}
