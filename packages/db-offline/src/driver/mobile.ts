import { PowerSyncDatabase } from "@powersync/react-native";
import { OPSqliteOpenFactory } from "@powersync/op-sqlite";
import { createOfflineDatabase, powerSyncSchema } from "../database";

export interface MobileDatabaseOptions {
  filename?: string;
}

export function createMobileDatabase(options: MobileDatabaseOptions = {}) {
  const database = new OPSqliteOpenFactory({
    dbFilename: options.filename ?? "expense-tracker.db",
  });
  const powerSync = new PowerSyncDatabase({
    schema: powerSyncSchema,
    database,
  });

  return { powerSync, db: createOfflineDatabase(powerSync) };
}
