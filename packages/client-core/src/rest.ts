import { z } from "zod";
import type {
  ExpenseDataClient,
  Result,
  SessionController,
} from "./application";
import {
  accountSchema,
  attachmentSchema,
  backupSchema,
  restoreDatasetSchema,
  transactionScheduleSchema,
  deviceSchema,
  assignmentSchema,
  envelopeAllocationSchema,
  envelopeTransferSchema,
  balanceSchema,
  budgetSchema,
  budgetUsageSchema,
  periodSpendingSchema,
  categorySpendingSchema,
  netWorthPointSchema,
  categorySchema,
  pageMetaSchema,
  sessionSchema,
  transactionSchema,
  transactionTagSchema,
  tagSchema,
  type PageMeta,
  type RegistrationInput,
  type Session,
  type User,
  type TransactionFilters,
  type TransactionInput,
  type AccountInput,
  type CategoryInput,
  type TagInput,
  type BudgetInput,
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

  accounts(signal?: AbortSignal, includeArchived = false) {
    return this.collection(
      `/api/accounts?page=1&pageSize=100&includeArchived=${includeArchived}`,
      accountSchema,
      signal,
    );
  }
  createAccount(value: AccountInput) {
    return this.request("/api/accounts", accountSchema, {
      method: "POST",
      body: JSON.stringify(value),
    });
  }
  updateAccount(
    id: string,
    value: Partial<AccountInput> & { isArchived?: boolean },
  ) {
    return this.requestEmpty(`/api/accounts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(value),
    });
  }
  deleteAccount(id: string) {
    return this.requestEmpty(`/api/accounts/${id}`, { method: "DELETE" });
  }
  balances(signal?: AbortSignal) {
    return this.request(
      "/api/reporting/account-balances",
      z.array(balanceSchema),
      signal ? { signal } : {},
    );
  }
  categories(signal?: AbortSignal, includeArchived = false) {
    return this.collection(
      `/api/categories?page=1&pageSize=100&includeArchived=${includeArchived}`,
      categorySchema,
      signal,
    );
  }
  createCategory(value: CategoryInput) {
    return this.request("/api/categories", categorySchema, {
      method: "POST",
      body: JSON.stringify(value),
    });
  }
  updateCategory(
    id: string,
    value: Partial<CategoryInput> & { isArchived?: boolean },
  ) {
    return this.requestEmpty(`/api/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(value),
    });
  }
  deleteCategory(id: string) {
    return this.requestEmpty(`/api/categories/${id}`, { method: "DELETE" });
  }
  tags(signal?: AbortSignal) {
    return this.collection("/api/tags?page=1&pageSize=100", tagSchema, signal);
  }
  createTag(value: TagInput) {
    return this.request("/api/tags", tagSchema, {
      method: "POST",
      body: JSON.stringify(value),
    });
  }
  updateTag(id: string, value: TagInput) {
    return this.requestEmpty(`/api/tags/${id}`, {
      method: "PATCH",
      body: JSON.stringify(value),
    });
  }
  deleteTag(id: string) {
    return this.requestEmpty(`/api/tags/${id}`, { method: "DELETE" });
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
    if (filters.search) query.set("search", filters.search);
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
  restoreTransaction(id: string) {
    return this.request(`/api/transactions/${id}/restore`, transactionSchema, {
      method: "POST",
    });
  }
  transactionTags(transactionId: string) {
    return this.collection(
      `/api/transactions/${transactionId}/tags?page=1&pageSize=100`,
      transactionTagSchema,
    );
  }
  addTransactionTag(transactionId: string, tagId: string) {
    return this.requestEmpty(`/api/transactions/${transactionId}/tags`, {
      method: "POST",
      body: JSON.stringify({ tagId }),
    });
  }
  removeTransactionTag(transactionId: string, tagId: string) {
    return this.requestEmpty(`/api/transactions/${transactionId}/tags`, {
      method: "DELETE",
      body: JSON.stringify({ tagId }),
    });
  }
  attachments(transactionId: string) {
    return this.collection(
      `/api/attachments?transactionId=${transactionId}&page=1&pageSize=100`,
      attachmentSchema,
    );
  }
  async uploadAttachment(
    transactionId: string,
    file: Blob & { name: string; type: string },
    attachmentId?: string,
  ) {
    const upload = await this.request(
      "/api/attachments/upload",
      z.object({
        attachmentId: z.string().uuid(),
        storageKey: z.string(),
        method: z.literal("PUT"),
        uploadUrl: z.string().url(),
        headers: z.record(z.string(), z.string()),
      }),
      {
        method: "POST",
        body: JSON.stringify({
          transactionId,
          ...(attachmentId ? { attachmentId } : {}),
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        }),
      },
    );
    const uploaded = await fetch(upload.data.uploadUrl, {
      method: "PUT",
      headers: upload.data.headers,
      body: file,
    });
    if (!uploaded.ok)
      throw new ApiError(
        uploaded.status,
        "The attachment bytes could not be uploaded",
      );
    return this.request("/api/attachments/complete", attachmentSchema, {
      method: "POST",
      body: JSON.stringify({
        attachmentId: upload.data.attachmentId,
        transactionId,
        fileName: file.name,
        storageKey: upload.data.storageKey,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      }),
    });
  }
  deleteAttachment(id: string) {
    return this.requestEmpty(`/api/attachments/${id}`, { method: "DELETE" });
  }
  attachmentDownload(id: string) {
    return this.request(
      `/api/attachments/${id}/download`,
      z.object({ downloadUrl: z.string().url(), expiresAt: z.string() }),
    );
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
  periodSpending(from: string, to: string) {
    return this.request(
      `/api/reporting/period-spending?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      z.array(periodSpendingSchema),
    );
  }
  categorySpending(from: string, to: string) {
    return this.request(
      `/api/reporting/category-spending?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      z.array(categorySpendingSchema),
    );
  }
  netWorthHistory(from: string, to: string) {
    return this.request(
      `/api/reporting/net-worth-history?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      z.array(netWorthPointSchema),
    );
  }
  createBudget(value: BudgetInput) {
    return this.request("/api/budgets", budgetSchema, {
      method: "POST",
      body: JSON.stringify(value),
    });
  }
  updateBudget(id: string, value: Partial<BudgetInput>) {
    return this.requestEmpty(`/api/budgets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(value),
    });
  }
  deleteBudget(id: string) {
    return this.requestEmpty(`/api/budgets/${id}`, { method: "DELETE" });
  }
  convertBudget(
    id: string,
    value: {
      targetName: string;
      targetAmount: string;
      targetRolloverPolicy: "NONE" | "POSITIVE_ONLY" | "FULL";
      expectedSourceUpdatedAt: string;
    },
  ) {
    return this.requestEmpty(`/api/budgets/${id}/conversion-preview`, {
      method: "POST",
      body: JSON.stringify(value),
    });
  }
  assignBudgetCategory(budgetId: string, categoryId: string) {
    return this.requestEmpty(`/api/budgets/${budgetId}/categories`, {
      method: "POST",
      body: JSON.stringify({ categoryId }),
    });
  }
  removeBudgetCategory(budgetId: string, categoryId: string) {
    return this.requestEmpty(`/api/budgets/${budgetId}/categories`, {
      method: "DELETE",
      body: JSON.stringify({ categoryId }),
    });
  }
  budgetCategories(budgetId: string) {
    return this.collection(
      `/api/budgets/${budgetId}/categories?page=1&pageSize=100`,
      assignmentSchema,
    );
  }
  envelopeAllocations(budgetId: string) {
    return this.request(
      `/api/budgets/${budgetId}/allocations`,
      z.array(envelopeAllocationSchema),
    );
  }
  allocateEnvelope(
    budgetId: string,
    value: {
      categoryId: string;
      amount: string;
      occurredAt: string;
      note: string | null;
    },
  ) {
    return this.requestEmpty(`/api/budgets/${budgetId}/allocations`, {
      method: "POST",
      body: JSON.stringify(value),
    });
  }
  envelopeTransfers(budgetId: string) {
    return this.request(
      `/api/budgets/${budgetId}/transfers`,
      z.array(envelopeTransferSchema),
    );
  }
  transferEnvelope(
    budgetId: string,
    value: {
      fromCategoryId: string | null;
      toCategoryId: string | null;
      amount: string;
      occurredAt: string;
      note: string | null;
    },
  ) {
    return this.requestEmpty(`/api/budgets/${budgetId}/transfers`, {
      method: "POST",
      body: JSON.stringify(value),
    });
  }
  devices(signal?: AbortSignal) {
    return this.collection(
      "/api/devices?page=1&pageSize=100",
      deviceSchema,
      signal,
    );
  }
  updateDevice(id: string, name: string) {
    return this.requestEmpty(`/api/devices/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
  }
  deleteDevice(id: string) {
    return this.requestEmpty(`/api/devices/${id}`, { method: "DELETE" });
  }
  updateProfile(value: {
    name?: string | null;
    currency?: string;
    timezone?: string;
  }) {
    return this.requestEmpty("/api/users/me", {
      method: "PATCH",
      body: JSON.stringify(value),
    });
  }
  deleteProfile() {
    return this.requestEmpty("/api/users/me", { method: "DELETE" });
  }
  deletionRequest() {
    return this.request(
      "/api/users/me/deletion",
      z
        .object({
          id: z.string().uuid(),
          requestedAt: z.string(),
          scheduledFor: z.string(),
        })
        .nullable(),
    );
  }
  cancelDeletion() {
    return this.requestEmpty("/api/users/me/deletion", { method: "DELETE" });
  }
  requestEmailChange(email: string) {
    return this.request(
      "/api/users/me/email-change",
      z.object({
        delivery: z.enum(["email", "development"]),
        developmentVerificationUrl: z.string().url().optional(),
      }),
      { method: "POST", body: JSON.stringify({ email }) },
    );
  }
  exportBackup() {
    return this.request("/api/users/me/backup", backupSchema);
  }
  stageRestore(name: string, backup: unknown) {
    return this.request(
      "/api/users/me/restore-datasets",
      restoreDatasetSchema,
      {
        method: "POST",
        body: JSON.stringify({ name, backup }),
      },
    );
  }
  restoreDatasets() {
    return this.request(
      "/api/users/me/restore-datasets",
      z.array(restoreDatasetSchema),
    );
  }
  restoreDataset(id: string) {
    return this.request(`/api/users/me/restore-datasets/${id}`, backupSchema);
  }
  reconcileAccount(
    accountId: string,
    value: {
      statementDate: string;
      statementBalance: string;
      clearedTransactionIds: string[];
    },
  ) {
    return this.request(`/api/accounts/${accountId}/reconcile`, z.unknown(), {
      method: "POST",
      body: JSON.stringify(value),
    });
  }
  schedules(through?: string) {
    return this.request(
      `/api/schedules${through ? `?through=${encodeURIComponent(through)}` : ""}`,
      z.array(transactionScheduleSchema),
    );
  }
  createSchedule(value: {
    accountId: string;
    transferAccountId: string | null;
    categoryId: string | null;
    type: "EXPENSE" | "INCOME" | "TRANSFER";
    amount: string;
    currency: string;
    description: string | null;
    note: string | null;
    frequency: "WEEKLY" | "MONTHLY" | "YEARLY";
    interval: number;
    startsOn: string;
    endsOn: string | null;
  }) {
    return this.request("/api/schedules", transactionScheduleSchema, {
      method: "POST",
      body: JSON.stringify(value),
    });
  }
  resolveScheduleOccurrence(id: string, action: "POSTED" | "SKIPPED") {
    return this.request(`/api/schedules/occurrences/${id}`, z.unknown(), {
      method: "POST",
      body: JSON.stringify({ action }),
    });
  }

  async registerDevice(
    name: string,
    platform: "WEB" | "DESKTOP" | "IOS" | "ANDROID",
  ) {
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

  private collection<T>(
    path: string,
    item: z.ZodType<T>,
    signal?: AbortSignal,
  ) {
    return this.request(path, z.array(item), signal ? { signal } : {}, true);
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
    private readonly deviceId?: (email: string) => Promise<string | null>,
    private readonly currentUser?: () => User | null,
  ) {}
  async login(email: string, password: string) {
    return this.auth("login", {
      email,
      password,
      deviceId: (await this.deviceId?.(email.toLowerCase())) ?? undefined,
    });
  }
  register(input: RegistrationInput) {
    return this.auth("register", input);
  }
  async refresh(refreshToken: string | null) {
    if (this.mode === "bff")
      return this.auth("refresh", refreshToken ? { refreshToken } : {});
    if (!refreshToken)
      throw new ApiError(
        401,
        "No refresh credential is available",
        "UNAUTHORIZED",
      );
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
        !user
          ? "Authenticated user is unavailable"
          : "Token response is invalid",
      ]);
    return { user, tokens: refreshed.data.data.tokens };
  }
  async logout(accessToken: string | null, refreshToken: string | null) {
    const path = this.mode === "bff" ? "/session/logout" : "/api/auth/logout";
    const response = await rawFetch(
      this.baseUrl,
      path,
      {
        method: "POST",
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      },
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
