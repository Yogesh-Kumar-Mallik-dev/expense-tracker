import type {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
} from "@powersync/common";

export function connectSync(
  database: AbstractPowerSyncDatabase,
  connector: PowerSyncBackendConnector,
) {
  return database.connect(connector);
}

export function disconnectSync(database: AbstractPowerSyncDatabase) {
  return database.disconnect();
}

export async function waitForInitialSync(database: AbstractPowerSyncDatabase) {
  await database.waitForFirstSync();
}
