import { createNodeLogger } from "@expense-tracker/logger/node";
import type { Logger } from "@expense-tracker/logger";

export const apiLogger: Logger = createNodeLogger({
  service: "expense-tracker-api",
  environment: process.env.NODE_ENV ?? "development",
  level: "INFO",
  ...(process.env.LOG_DIRECTORY
    ? { jsonDirectory: process.env.LOG_DIRECTORY }
    : {}),
  transformUserId: (userId) => userId,
});
