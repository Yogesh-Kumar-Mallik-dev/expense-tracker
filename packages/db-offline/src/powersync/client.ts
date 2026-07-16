import type { AbstractPowerSyncDatabase } from "@powersync/common";
import type { OfflineDatabase } from "../database";

export interface OfflineClient {
  powerSync: AbstractPowerSyncDatabase;
  db: OfflineDatabase;
}

let currentClient: OfflineClient | undefined;

export function setOfflineClient(client: OfflineClient) {
  currentClient = client;
  return client;
}

export function getOfflineClient(): OfflineClient {
  if (!currentClient) {
    throw new Error("Offline database has not been initialized for this platform");
  }
  return currentClient;
}

export async function closeOfflineClient() {
  if (!currentClient) return;
  await currentClient.powerSync.close();
  currentClient = undefined;
}
