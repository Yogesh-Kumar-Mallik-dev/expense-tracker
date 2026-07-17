import type { AccountRecord } from "@expense-tracker/services/account";
import type {
  BudgetModeConversionPreview,
  BudgetRecord,
} from "@expense-tracker/services/budget";
import type {
  AccountBalance,
  BudgetUsage,
} from "@expense-tracker/services/reporting";
import type { TransactionRecord } from "@expense-tracker/services/transaction";

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface DashboardData {
  accounts: AccountRecord[];
  balances: AccountBalance[];
  transactions: TransactionRecord[];
  transactionMeta: PageMeta;
  budgets: BudgetRecord[];
  budgetUsage: BudgetUsage[];
}

export interface Session {
  user: { id: string; email: string; name: string | null; currency: string };
  tokens: { accessToken: string; refreshToken: string; expiresIn: number };
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly correlationId?: string,
  ) {
    super(message);
  }
}

export class ExpenseApi {
  constructor(
    readonly baseUrl: string,
    private readonly token: () => string | null,
    readonly onMetadata?: (value: {
      requestId: string | null;
      remaining: string | null;
    }) => void,
  ) {}

  login(email: string, password: string) {
    return this.request<Session>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
      false,
    );
  }

  async dashboard(page = 1): Promise<DashboardData> {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);
    const [accounts, balances, transactions, budgets, budgetUsage] =
      await Promise.all([
        this.request<AccountRecord[]>("/api/accounts?page=1&pageSize=100"),
        this.request<AccountBalance[]>("/api/reporting/account-balances"),
        this.request<TransactionRecord[]>(
          `/api/transactions?page=${page}&pageSize=8`,
        ),
        this.request<BudgetRecord[]>(
          `/api/budgets?from=${from}&to=${to}&page=1&pageSize=100`,
        ),
        this.request<BudgetUsage[]>(
          `/api/reporting/budget-usage?from=${from}&to=${to}`,
        ),
      ]);
    return {
      accounts: accounts.data,
      balances: balances.data,
      transactions: transactions.data,
      transactionMeta: transactions.meta!,
      budgets: budgets.data,
      budgetUsage: budgetUsage.data,
    };
  }

  createTransaction(value: {
    accountId: string;
    type: "EXPENSE" | "INCOME";
    amount: string;
    currency: string;
    description: string;
  }) {
    return this.request<TransactionRecord>("/api/transactions", {
      method: "POST",
      body: JSON.stringify({
        ...value,
        categoryId: null,
        transferAccountId: null,
        note: null,
        occurredAt: new Date().toISOString(),
      }),
    });
  }

  previewBudgetConversion(id: string) {
    return this.request<BudgetModeConversionPreview>(
      `/api/budgets/${id}/conversion-preview`,
    );
  }

  convertBudget(id: string) {
    return this.request<BudgetRecord>(`/api/budgets/${id}/conversion-preview`, {
      method: "POST",
    });
  }

  private async request<T>(path: string, init: RequestInit = {}, auth = true) {
    const headers = new Headers(init.headers);
    headers.set("accept", "application/json");
    headers.set(
      "X-Request-ID",
      `UI_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    );
    if (init.body) headers.set("content-type", "application/json");
    if (auth && this.token())
      headers.set("authorization", `Bearer ${this.token()}`);
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}${path}`, {
      ...init,
      headers,
    });
    const requestId = response.headers.get("X-Request-ID");
    this.onMetadata?.({
      requestId,
      remaining: response.headers.get("RateLimit-Remaining"),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      data?: T;
      meta?: PageMeta;
      error?: { message?: string; errorId?: string };
    };
    if (!response.ok)
      throw new ApiError(
        response.status,
        payload.error?.message ?? "The request failed",
        payload.error?.errorId ?? requestId ?? undefined,
      );
    return { data: payload.data as T, meta: payload.meta };
  }
}
