import type { AbstractPowerSyncDatabase } from "@powersync/common";
import { DrizzleAppSchema, wrapPowerSyncWithDrizzle } from "@powersync/drizzle-driver";
import { drizzleSchema, refreshTokens } from "./schema";

export const powerSyncSchema = new DrizzleAppSchema({
  ...drizzleSchema,
  refreshTokens: {
    tableDefinition: refreshTokens,
    options: { localOnly: true },
  },
});

export function createOfflineDatabase(powerSync: AbstractPowerSyncDatabase) {
  return wrapPowerSyncWithDrizzle(powerSync, { schema: drizzleSchema });
}

export type OfflineDatabase = ReturnType<typeof createOfflineDatabase>;
export type PowerSyncDatabase = AbstractPowerSyncDatabase;
