import { PowerSyncDatabase } from "@powersync/web";
import { createOfflineDatabase, powerSyncSchema } from "../database";

export interface WebDatabaseOptions {
  filename?: string;
  enableMultiTabs?: boolean;
}

export function createWebDatabase(options: WebDatabaseOptions = {}) {
  const powerSync = new PowerSyncDatabase({
    schema: powerSyncSchema,
    database: { dbFilename: options.filename ?? "expense-tracker.db" },
    flags: {
      enableMultiTabs: options.enableMultiTabs ?? true,
    },
  });

  return { powerSync, db: createOfflineDatabase(powerSync) };
}
