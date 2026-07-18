import type { OfflineDatabase } from "../database";

export interface ClosablePowerSyncDatabase {
  close: () => Promise<void>;
}

export interface OfflineClient {
  powerSync: ClosablePowerSyncDatabase;
  db: OfflineDatabase;
}

let currentClient: OfflineClient | undefined;

export function setOfflineClient<T extends OfflineClient>(client: T): T {
  currentClient = client;
  return client;
}

export function getOfflineClient(): OfflineClient {
  if (!currentClient) {
    throw new Error(
      "Offline database has not been initialized for this platform",
    );
  }
  return currentClient;
}

export async function closeOfflineClient() {
  if (!currentClient) return;
  await currentClient.powerSync.close();
  currentClient = undefined;
}
