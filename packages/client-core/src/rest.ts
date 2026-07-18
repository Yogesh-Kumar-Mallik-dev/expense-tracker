import { z } from "zod";
import type { ExpenseDataClient, Result, SessionController } from "./application";
import {
  accountSchema,
  balanceSchema,
  budgetSchema,
  budgetUsageSchema,
  categorySchema,
  pageMetaSchema,
  sessionSchema,
  transactionSchema,
  type PageMeta,
  type RegistrationInput,
  type Session,
  type User,
  type TransactionFilters,
  type TransactionInput,
} from "./contracts";
import { ApiError, ResponseValidationError } from "./errors";
import type { AuthenticationTransport } from "./session";

interface AccessController {
  getAccessToken(): Promise<string | null>;
  refresh(): Promise<Session>;
}

export class RestExpenseClient implements ExpenseDataClient {
  constructor(
    readonly baseUrl: string,
    private readonly access: AccessController,
  ) {}

  accounts(signal?: AbortSignal) {
    return this.collection("/api/accounts?page=1&pageSize=100", accountSchema, signal);
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
    return this.collection(`/api/transactions?${query}`, transactionSchema, signal);
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

  async registerDevice(name: string, platform: "WEB" | "DESKTOP") {
    return this.request(
      "/api/devices",
      z.object({
        id: z.string().uuid(),
        userId: z.string().uuid(),
        name: z.string(),
        platform: z.enum(["WEB", "DESKTOP", "IOS", "ANDROID"]),
        lastSeenAt: z.string(),
        createdAt: z.string(),
        deletedAt: z.string().nullable(),
      }),
      { method: "POST", body: JSON.stringify({ name, platform }) },
    );
  }

  private collection<T>(path: string, item: z.ZodType<T>, signal?: AbortSignal) {
    return this.request(
      path,
      z.array(item),
      signal ? { signal } : {},
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
    requireMeta = false,
  ): Promise<Result<T>> {
    const response = await this.raw(path, init, true);
    return parseEnvelope(response, path, schema, requireMeta);
  }
  private async raw(
    path: string,
    init: RequestInit,
    retry: boolean,
  ): Promise<Response> {
    const token = await this.access.getAccessToken();
    const response = await rawFetch(this.baseUrl, path, init, token);
    if (response.status === 401 && retry) {
      await this.access.refresh();
      return this.raw(path, init, false);
    }
    if (!response.ok) throw await apiError(response);
    return response;
  }
}

export class RestAuthenticationTransport implements AuthenticationTransport {
  constructor(
    private readonly baseUrl: string,
    private readonly mode: "direct" | "bff" = "direct",
    private readonly deviceId?: () => Promise<string | null>,
    private readonly currentUser?: () => User | null,
  ) {}
  async login(email: string, password: string) {
    return this.auth("login", {
      email,
      password,
      deviceId: (await this.deviceId?.()) ?? undefined,
    });
  }
  register(input: RegistrationInput) {
    return this.auth("register", input);
  }
  async refresh(refreshToken: string | null) {
    if (this.mode === "bff")
      return this.auth("refresh", refreshToken ? { refreshToken } : {});
    if (!refreshToken)
      throw new ApiError(401, "No refresh credential is available", "UNAUTHORIZED");
    const response = await rawFetch(
      this.baseUrl,
      "/api/auth/refresh",
      { method: "POST", body: JSON.stringify({ refreshToken }) },
      null,
    );
    if (!response.ok) throw await apiError(response);
    const payload = await response.json().catch(() => ({}));
    const refreshed = z
      .object({
        data: z.object({
          user: sessionSchema.shape.user.optional(),
          tokens: sessionSchema.shape.tokens,
        }),
      })
      .safeParse(payload);
    const user = refreshed.success
      ? (refreshed.data.data.user ?? this.currentUser?.())
      : null;
    if (!refreshed.success || !user)
      throw new ResponseValidationError("/api/auth/refresh", [
        !user ? "Authenticated user is unavailable" : "Token response is invalid",
      ]);
    return { user, tokens: refreshed.data.data.tokens };
  }
  async logout(accessToken: string | null, refreshToken: string | null) {
    const path =
      this.mode === "bff" ? "/session/logout" : "/api/auth/logout";
    const response = await rawFetch(
      this.baseUrl,
      path,
      { method: "POST", body: JSON.stringify(refreshToken ? { refreshToken } : {}) },
      accessToken,
    );
    if (!response.ok && response.status !== 401) throw await apiError(response);
  }
  private async auth(action: string, body: unknown) {
    const path =
      this.mode === "bff" ? `/session/${action}` : `/api/auth/${action}`;
    const response = await rawFetch(
      this.baseUrl,
      path,
      { method: "POST", body: JSON.stringify(body) },
      null,
    );
    if (!response.ok) throw await apiError(response);
    return (await parseEnvelope(response, path, sessionSchema)).data;
  }
}

async function rawFetch(
  baseUrl: string,
  path: string,
  init: RequestInit,
  token: string | null,
) {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  headers.set("X-Request-ID", crypto.randomUUID());
  if (init.body) headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);
  return fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers,
    credentials: "same-origin",
  });
}

async function parseEnvelope<T>(
  response: Response,
  path: string,
  schema: z.ZodType<T>,
  requireMeta = false,
): Promise<Result<T>> {
  const payload = await response.json().catch(() => ({}));
  const envelope = z
    .object({ data: schema, meta: pageMetaSchema.optional() })
    .safeParse(payload);
  if (!envelope.success || (requireMeta && !envelope.data.meta))
    throw new ResponseValidationError(
      path,
      envelope.success
        ? ["Pagination metadata is missing"]
        : envelope.error.issues.map((issue) => issue.path.join(".")),
    );
  return envelope.data.meta
    ? { data: envelope.data.data, meta: envelope.data.meta as PageMeta }
    : { data: envelope.data.data };
}

async function apiError(response: Response) {
  const payload = await response.clone().json().catch(() => ({}));
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
  return new ApiError(
    response.status,
    parsed.data?.error?.message ?? "The request failed",
    parsed.data?.error?.code,
    parsed.data?.error?.errorId ??
      response.headers.get("X-Request-ID") ??
      undefined,
    parsed.data?.error?.fields,
  );
}

export function createRestApplication(options: {
  baseUrl: string;
  session: SessionController;
}) {
  return new RestExpenseClient(options.baseUrl, options.session);
}
