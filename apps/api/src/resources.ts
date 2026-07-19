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
import {
  attachmentQuerySchema,
  categoryOptionsQuerySchema,
  financialPeriodQuerySchema,
  parseQuery,
  resourceOptionsQuerySchema,
  transactionQuerySchema,
} from "./query";

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
    case "accounts": {
      const query = parseQuery(resourceOptionsQuerySchema, url, [
        "includeArchived",
      ]);
      return paginated(
        await services.accounts.list(userId, query.includeArchived),
      );
    }
    case "categories": {
      const query = parseQuery(categoryOptionsQuerySchema, url, [
        "type",
        "includeArchived",
      ]);
      return paginated(
        await services.categories.list(
          userId,
          query.type,
          query.includeArchived,
        ),
      );
    }
    case "tags":
      return paginated(await services.tags.list(userId));
    case "budgets": {
      const query = parseQuery(
        financialPeriodQuerySchema,
        url,
        ["from", "to"],
        "INVALID_PERIOD",
      );
      return paginated(
        await services.budgets.listForPeriod(userId, query.from, query.to),
      );
    }
    case "transactions": {
      const { page, pageSize } = paginationParams(url);
      const query = parseQuery(transactionQuerySchema, url, [
        "accountId",
        "categoryId",
        "from",
        "to",
        "search",
      ]);
      const result = await services.transactions.page(userId, {
        ...(query.accountId ? { accountId: query.accountId } : {}),
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.from ? { from: query.from } : {}),
        ...(query.to ? { to: query.to } : {}),
        ...(query.search ? { search: query.search } : {}),
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
      const { transactionId } = parseQuery(attachmentQuerySchema, url, [
        "transactionId",
      ]);
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
      return ok(await services.transactions.create(value), 201);
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
    const value = updateTransactionSchema.parse(
      input,
    ) as UpdateTransactionInput;
    await validateTransactionRelationships(userId, {
      accountId: value.accountId,
      transferAccountId: value.transferAccountId,
      categoryId:
        value.categoryId === undefined ? existing.categoryId : value.categoryId,
      type: value.type,
      currency: value.currency ?? existing.currency,
    });
    await services.transactions.update(id, userId, value);
  } else if (name === "devices")
    await services.devices.update(id, userId, input);
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
