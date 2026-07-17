import { z } from "zod";

const money = z.string().regex(/^\d+(?:\.\d{1,4})?$/);
const nullableString = z.string().nullable();
const pageMetaSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNext: z.boolean(),
  hasPrevious: z.boolean(),
});
const accountSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  type: z.enum([
    "CASH",
    "CHECKING",
    "SAVINGS",
    "CREDIT_CARD",
    "WALLET",
    "OTHER",
  ]),
  currency: z.string().length(3),
  openingBalance: money,
  color: nullableString,
  icon: nullableString,
  isArchived: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: nullableString,
});
const categorySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  parentId: nullableString,
  name: z.string(),
  type: z.enum(["EXPENSE", "INCOME"]),
  color: nullableString,
  icon: nullableString,
  isArchived: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: nullableString,
});
const transactionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  accountId: z.string().uuid(),
  transferAccountId: nullableString,
  categoryId: nullableString,
  type: z.enum(["EXPENSE", "INCOME", "TRANSFER"]),
  amount: money,
  currency: z.string().length(3),
  description: nullableString,
  note: nullableString,
  occurredAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: nullableString,
});
const budgetSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  amount: money,
  currency: z.string().length(3),
  startsOn: z.string(),
  endsOn: z.string(),
  mode: z.enum(["SPENDING_LIMIT", "ENVELOPE"]),
  rolloverPolicy: z.enum(["NONE", "POSITIVE_ONLY", "FULL"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: nullableString,
});
const balanceSchema = z.object({
  accountId: z.string().uuid(),
  currency: z.string().length(3),
  balance: z.string(),
  excludedTransactionIds: z.array(z.string().uuid()),
});
const budgetUsageSchema = z.object({
  budgetId: z.string().uuid(),
  mode: z.enum(["SPENDING_LIMIT", "ENVELOPE"]),
  currency: z.string().length(3),
  spent: z.string(),
  remaining: z.string(),
  assigned: z.string(),
  available: z.string(),
  excludedTransactionIds: z.array(z.string().uuid()),
});
const sessionSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: nullableString,
    currency: z.string().length(3),
  }),
  tokens: z.object({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
    expiresIn: z.number().positive(),
  }),
});

export type Account = z.infer<typeof accountSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type Budget = z.infer<typeof budgetSchema>;
export type AccountBalance = z.infer<typeof balanceSchema>;
export type BudgetUsage = z.infer<typeof budgetUsageSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type PageMeta = z.infer<typeof pageMetaSchema>;

export interface TransactionFilters {
  page: number;
  pageSize: number;
  accountId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
}

export interface TransactionInput {
  accountId: string;
  transferAccountId: string | null;
  categoryId: string | null;
  type: "EXPENSE" | "INCOME" | "TRANSFER";
  amount: string;
  currency: string;
  description: string | null;
  note: string | null;
  occurredAt: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code = "REQUEST_FAILED",
    readonly correlationId?: string,
    readonly fields: string[] = [],
  ) {
    super(message);
  }
}

export class ResponseValidationError extends Error {
  constructor(
    readonly path: string,
    readonly issues: string[],
  ) {
    super(`The server returned an unexpected response for ${path}`);
  }
}

export class ExpenseApi {
  constructor(
    readonly baseUrl: string,
    private readonly token: () => string | null,
  ) {}

  login(email: string, password: string, signal?: AbortSignal) {
    return this.request(
      "/api/auth/login",
      sessionSchema,
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
        ...(signal ? { signal } : {}),
      },
      false,
    );
  }

  logout(refreshToken: string) {
    return this.requestEmpty("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  }

  accounts(signal?: AbortSignal) {
    return this.collection(
      "/api/accounts?page=1&pageSize=100",
      accountSchema,
      signal,
    );
  }

  balances(signal?: AbortSignal) {
    return this.request(
      "/api/reporting/account-balances",
      z.array(balanceSchema),
      signal ? { signal } : {},
    );
  }

  categories(signal?: AbortSignal) {
    return this.collection(
      "/api/categories?page=1&pageSize=100",
      categorySchema,
      signal,
    );
  }

  transactions(filters: TransactionFilters, signal?: AbortSignal) {
    const query = new URLSearchParams({
      page: String(filters.page),
      pageSize: String(filters.pageSize),
    });
    if (filters.accountId) query.set("accountId", filters.accountId);
    if (filters.categoryId) query.set("categoryId", filters.categoryId);
    if (filters.from)
      query.set("from", new Date(`${filters.from}T00:00:00`).toISOString());
    if (filters.to)
      query.set("to", new Date(`${filters.to}T23:59:59.999`).toISOString());
    return this.collection(
      `/api/transactions?${query}`,
      transactionSchema,
      signal,
    );
  }

  createTransaction(value: TransactionInput) {
    return this.request("/api/transactions", transactionSchema, {
      method: "POST",
      body: JSON.stringify(value),
    });
  }

  updateTransaction(id: string, value: TransactionInput) {
    return this.requestEmpty(`/api/transactions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(value),
    });
  }

  deleteTransaction(id: string) {
    return this.requestEmpty(`/api/transactions/${id}`, { method: "DELETE" });
  }

  budgets(from: string, to: string, signal?: AbortSignal) {
    return this.collection(
      `/api/budgets?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&page=1&pageSize=100`,
      budgetSchema,
      signal,
    );
  }

  budgetUsage(from: string, to: string, signal?: AbortSignal) {
    return this.request(
      `/api/reporting/budget-usage?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      z.array(budgetUsageSchema),
      signal ? { signal } : {},
    );
  }

  private collection<T>(
    path: string,
    item: z.ZodType<T>,
    signal?: AbortSignal,
  ) {
    return this.request(
      path,
      z.array(item),
      signal ? { signal } : {},
      true,
      true,
    );
  }

  private async requestEmpty(path: string, init: RequestInit) {
    await this.raw(path, init, true);
  }

  private async request<T>(
    path: string,
    schema: z.ZodType<T>,
    init: RequestInit = {},
    auth = true,
    requireMeta = false,
  ): Promise<{ data: T; meta?: PageMeta }> {
    const response = await this.raw(path, init, auth);
    const payload = await response.json().catch(() => ({}));
    const envelope = z
      .object({ data: schema, meta: pageMetaSchema.optional() })
      .safeParse(payload);
    if (!envelope.success || (requireMeta && !envelope.data?.meta)) {
      throw new ResponseValidationError(
        path,
        envelope.success
          ? ["Pagination metadata is missing"]
          : envelope.error.issues.map((issue) => issue.path.join(".")),
      );
    }
    return envelope.data.meta
      ? { data: envelope.data.data, meta: envelope.data.meta }
      : { data: envelope.data.data };
  }

  private async raw(path: string, init: RequestInit, auth: boolean) {
    const headers = new Headers(init.headers);
    headers.set("accept", "application/json");
    headers.set("X-Request-ID", crypto.randomUUID());
    if (init.body) headers.set("content-type", "application/json");
    const token = this.token();
    if (auth && token) headers.set("authorization", `Bearer ${token}`);
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}${path}`, {
      ...init,
      headers,
    });
    if (!response.ok) {
      const payload = await response
        .clone()
        .json()
        .catch(() => ({}));
      const parsed = z
        .object({
          error: z
            .object({
              code: z.string().optional(),
              message: z.string().optional(),
              errorId: z.string().optional(),
              fields: z.array(z.string()).optional(),
            })
            .optional(),
        })
        .safeParse(payload);
      throw new ApiError(
        response.status,
        parsed.data?.error?.message ?? "The request failed",
        parsed.data?.error?.code,
        parsed.data?.error?.errorId ??
          response.headers.get("X-Request-ID") ??
          undefined,
        parsed.data?.error?.fields,
      );
    }
    return response;
  }
}
