import { requireUser } from "./auth";
import { body, empty, HttpError, ok } from "./http";
import { paginate, paginationParams } from "./pagination";
import { services } from "./services";
import {
  createTransactionSchema,
  type UpdateTransactionInput,
  updateTransactionSchema,
} from "@expense-tracker/services";
import {
  validateAttachmentRelationship,
  validateTransactionRelationships,
} from "./domain-authorization";

export type ResourceName =
  | "accounts"
  | "categories"
  | "tags"
  | "budgets"
  | "transactions"
  | "attachments"
  | "devices";

type Context = { params: Promise<{ id: string }> };

export async function listResource(name: ResourceName, request: Request) {
  const userId = await requireUser(request);
  const url = new URL(request.url);
  const paginated = <T>(values: readonly T[]) => {
    const result = paginate(values, url);
    return ok(result.data, 200, result.meta);
  };
  switch (name) {
    case "accounts":
      return paginated(
        await services.accounts.list(
          userId,
          url.searchParams.get("includeArchived") === "true",
        ),
      );
    case "categories":
      return paginated(
        await services.categories.list(
          userId,
          (url.searchParams.get("type") || undefined) as
            | "EXPENSE"
            | "INCOME"
            | undefined,
          url.searchParams.get("includeArchived") === "true",
        ),
      );
    case "tags":
      return paginated(await services.tags.list(userId));
    case "budgets": {
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      if (!from || !to)
        throw new HttpError(
          400,
          "MISSING_PERIOD",
          "from and to query parameters are required",
        );
      return paginated(await services.budgets.listForPeriod(userId, from, to));
    }
    case "transactions": {
      const { page, pageSize } = paginationParams(url);
      const result = await services.transactions.page(userId, {
          ...(url.searchParams.get("accountId")
            ? { accountId: url.searchParams.get("accountId")! }
            : {}),
          ...(url.searchParams.get("categoryId")
            ? { categoryId: url.searchParams.get("categoryId")! }
            : {}),
          ...(url.searchParams.get("from")
            ? { from: url.searchParams.get("from")! }
            : {}),
          ...(url.searchParams.get("to")
            ? { to: url.searchParams.get("to")! }
            : {}),
          offset: (page - 1) * pageSize,
          limit: pageSize,
        });
      const totalPages =
        result.total === 0 ? 0 : Math.ceil(result.total / pageSize);
      return ok(result.items, 200, {
        page,
        pageSize,
        total: result.total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1 && result.total > 0,
      });
    }
    case "attachments": {
      const transactionId = url.searchParams.get("transactionId");
      if (!transactionId)
        throw new HttpError(
          400,
          "MISSING_TRANSACTION",
          "transactionId is required",
        );
      return paginated(
        await services.attachments.listByTransaction(transactionId, userId),
      );
    }
    case "devices":
      return paginated(await services.devices.list(userId));
  }
}

export async function createResource(name: ResourceName, request: Request) {
  const userId = await requireUser(request);
  const input = await body(request);
  switch (name) {
    case "accounts":
      return ok(
        await services.accounts.create({ ...input, userId } as never),
        201,
      );
    case "categories":
      return ok(
        await services.categories.create({ ...input, userId } as never),
        201,
      );
    case "tags":
      return ok(await services.tags.create({ ...input, userId } as never), 201);
    case "budgets":
      return ok(
        await services.budgets.create({ ...input, userId } as never),
        201,
      );
    case "transactions": {
      const value = createTransactionSchema.parse({ ...input, userId });
      await validateTransactionRelationships(userId, value);
      return ok(
        await services.transactions.create(value),
        201,
      );
    }
    case "attachments":
      if (
        typeof input.transactionId !== "string" ||
        typeof input.storageKey !== "string"
      )
        throw new HttpError(
          400,
          "INVALID_ATTACHMENT",
          "transactionId and storageKey are required",
          ["transactionId", "storageKey"],
        );
      await validateAttachmentRelationship(
        userId,
        input.transactionId,
        input.storageKey,
      );
      return ok(
        await services.attachments.create({ ...input, userId } as never),
        201,
      );
    case "devices":
      return ok(
        await services.devices.create({ ...input, userId } as never),
        201,
      );
  }
}

export async function getResource(
  name: ResourceName,
  request: Request,
  context: Context,
) {
  const userId = await requireUser(request);
  const { id } = await context.params;
  const value =
    name === "accounts"
      ? await services.accounts.get(id, userId)
      : name === "categories"
        ? await services.categories.get(id, userId)
        : name === "tags"
          ? await services.tags.get(id, userId)
          : name === "budgets"
            ? await services.budgets.get(id, userId)
            : name === "transactions"
              ? await services.transactions.get(id, userId)
              : name === "attachments"
                ? await services.attachments.get(id, userId)
                : await services.devices.get(id, userId);
  if (!value) throw new HttpError(404, "NOT_FOUND", "Record not found");
  return ok(value);
}

export async function updateResource(
  name: ResourceName,
  request: Request,
  context: Context,
) {
  const userId = await requireUser(request);
  const { id } = await context.params;
  const input = await body(request);
  if (name === "accounts") await services.accounts.update(id, userId, input);
  else if (name === "categories")
    await services.categories.update(id, userId, input);
  else if (name === "tags") await services.tags.update(id, userId, input);
  else if (name === "budgets") await services.budgets.update(id, userId, input);
  else if (name === "transactions") {
    const existing = await services.transactions.get(id, userId);
    if (!existing) throw new HttpError(404, "NOT_FOUND", "Record not found");
    const value = updateTransactionSchema.parse(input) as UpdateTransactionInput;
    await validateTransactionRelationships(userId, {
      accountId: value.accountId,
      transferAccountId: value.transferAccountId,
      categoryId:
        value.categoryId === undefined
          ? existing.categoryId
          : value.categoryId,
      type: value.type,
      currency: value.currency ?? existing.currency,
    });
    await services.transactions.update(id, userId, value);
  }
  else if (name === "devices") await services.devices.update(id, userId, input);
  else
    throw new HttpError(
      405,
      "METHOD_NOT_ALLOWED",
      "Attachments cannot be updated",
    );
  return empty();
}

export async function deleteResource(
  name: ResourceName,
  request: Request,
  context: Context,
) {
  const userId = await requireUser(request);
  const { id } = await context.params;
  if (name === "accounts") await services.accounts.delete(id, userId);
  else if (name === "categories") await services.categories.delete(id, userId);
  else if (name === "tags") await services.tags.delete(id, userId);
  else if (name === "budgets") await services.budgets.delete(id, userId);
  else if (name === "transactions")
    await services.transactions.delete(id, userId);
  else if (name === "attachments")
    await services.attachments.delete(id, userId);
  else await services.devices.delete(id, userId);
  return empty();
}
