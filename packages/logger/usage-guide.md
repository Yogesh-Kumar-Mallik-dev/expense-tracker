# Logger Usage Guide

For contracts and security decisions, see [docs.md](./docs.md).

## Node logger

```ts
import { createNodeLogger } from "@expense-tracker/logger/node";

export const logger = createNodeLogger({
  service: "expense-tracker-api",
  level: "INFO",
  jsonDirectory: "logs",
  transformUserId: (userId) => userId,
});
```

Environment controls:

```env
LOG_LEVEL=INFO
LOG_DIRECTORY=logs
LOG_STACKS=false
TRUST_PROXY=false
NO_COLOR=
```

All enabled entries go to the box console and rotating JSONL file.

## Request scope

```ts
import {
  createRequestScope,
  nextErrorId,
  runWithRequest,
  setCurrentUser,
} from "@expense-tracker/logger/node";

const scope = createRequestScope(request, { trustProxy: true });

return runWithRequest(scope, async () => {
  setCurrentUser(authenticatedUserId);

  try {
    return await handleRequest();
  } catch (error) {
    const errorId = nextErrorId(scope);
    logger.exception(scope.request, error, errorId);
    throw error;
  }
});
```

The API's shared route wrapper already performs this setup. Individual handlers
should not emit a second request-completion summary.

## Prisma and Drizzle

```ts
import {
  logDrizzleOperation,
  logPrismaOperation,
} from "@expense-tracker/logger/database";

const accounts = await logPrismaOperation(
  logger,
  { request: scope.request, model: "Account", operation: "findMany" },
  () => prisma.account.findMany({ where: { userId } }),
);

const transactions = await logDrizzleOperation(
  logger,
  { request: scope.request, model: "Transaction", operation: "select" },
  () => repository.listByUser(userId),
);
```

The wrappers return the original result, infer row counts where possible, and
rethrow failures. Do not pass SQL or arguments as fields.

## Browser and mobile diagnostics

```ts
import { createClientLogger } from "@expense-tracker/logger/browser";

const { logger, diagnostics } = createClientLogger({
  service: "expense-tracker-web",
  runtime: "browser",
  level: "INFO",
});

logger.success({ message: "Offline database initialized" });
diagnostics.download();
```

For React Native, call `diagnostics.exportJsonl()` and provide the string to the
platform file/share API.

## Graceful shutdown

Long-running Node processes should flush queued JSON writes:

```ts
await logger.flush();
```
