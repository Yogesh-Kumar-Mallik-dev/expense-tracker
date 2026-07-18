import { PowerSyncTauriDatabase } from "@powersync/tauri-plugin";
import type { AbstractPowerSyncDatabase } from "@powersync/common";
import { createOfflineDatabase, powerSyncSchema } from "../database";

export interface DesktopDatabaseOptions {
  filename?: string;
  location?: () => Promise<string>;
}

export type TauriInvoke = <T>(
  command: string,
  args?: Record<string, unknown>,
) => Promise<T>;

export function createDesktopDatabase(options: DesktopDatabaseOptions = {}) {
  const powerSync = new PowerSyncTauriDatabase({
    // The alpha Tauri SDK currently bundles an older @powersync/common type.
    schema: powerSyncSchema as never,
    database: {
      dbFilename: options.filename ?? "expense-tracker.db",
      ...(options.location ? { dbLocationAsync: options.location } : {}),
    },
  });

  return {
    powerSync,
    db: createOfflineDatabase(
      powerSync as unknown as AbstractPowerSyncDatabase,
    ),
  };
}

export async function connectDesktopDatabase(
  powerSync: PowerSyncTauriDatabase,
  invoke: TauriInvoke,
  command = "connect_powersync",
) {
  await powerSync.init();
  await invoke<void>(command, { handle: powerSync.rustHandle });
}
