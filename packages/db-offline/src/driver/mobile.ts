import { PowerSyncDatabase } from "@powersync/react-native";
import { createOfflineDatabase, powerSyncSchema } from "../database";

export interface MobileDatabaseOptions {
  filename?: string;
}

export function createMobileDatabase(options: MobileDatabaseOptions = {}) {
  const powerSync = new PowerSyncDatabase({
    schema: powerSyncSchema,
    database: { dbFilename: options.filename ?? "expense-tracker.db" },
  });

  return { powerSync, db: createOfflineDatabase(powerSync) };
}
