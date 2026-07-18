import {
  OfflineBackendConnector,
  createHttpCredentialsProvider,
  createOfflineServices,
  restoreBackupSnapshot,
  users,
  type OfflineServices,
} from "@expense-tracker/db-offline";
import { createMobileDatabase } from "@expense-tracker/db-offline/driver/mobile";
import {
  stableUserDatabaseIdentity,
  type ApplicationSyncState,
  type LocalDatabaseLifecycle,
  type SessionController,
  type SyncController,
  type Backup,
} from "@expense-tracker/client-core";

export class MobileOfflineRuntime
  implements LocalDatabaseLifecycle, SyncController
{
  private client: ReturnType<typeof createMobileDatabase> | null = null;
  private value: OfflineServices | null = null;
  private current: ApplicationSyncState = {
    status: "offline",
    lastSyncedAt: null,
    pendingWrites: null,
    error: null,
  };
  private listeners = new Set<(state: ApplicationSyncState) => void>();
  constructor(
    private readonly session: () => SessionController,
    private readonly apiUrl: string,
  ) {}
  services() {
    if (!this.value) throw new Error("Local database is not ready");
    return this.value;
  }
  identityFor(userId: string) {
    return stableUserDatabaseIdentity(userId);
  }
  async open(userId: string) {
    await this.close();
    const filename = await stableUserDatabaseIdentity(userId);
    const client = createMobileDatabase({ filename });
    this.client = client;
    this.value = createOfflineServices(client.db);
    const auth = this.session().state();
    if (auth.status === "authenticated") {
      const now = new Date().toISOString();
      await client.db
        .insert(users)
        .values({
          ...auth.session.user,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email: auth.session.user.email,
            name: auth.session.user.name,
            currency: auth.session.user.currency,
            timezone: auth.session.user.timezone,
            updatedAt: now,
          },
        });
    }
    client.powerSync.registerListener({
      statusChanged: (status) =>
        this.set({
          status: status.dataFlowStatus.uploadError
            ? "failed"
            : status.dataFlowStatus.uploading ||
                status.dataFlowStatus.downloading
              ? "synchronizing"
              : status.connected && status.hasSynced
                ? "synchronized"
                : status.connecting
                  ? "connecting"
                  : "offline",
          lastSyncedAt: status.lastSyncedAt?.toISOString() ?? null,
          pendingWrites: null,
          error:
            status.dataFlowStatus.uploadError?.message ??
            status.dataFlowStatus.downloadError?.message ??
            null,
        }),
    });
    const connector = new OfflineBackendConnector({
      credentials: createHttpCredentialsProvider({
        endpoint: `${this.apiUrl}/api/powersync/credentials`,
        getAccessToken: () => this.session().getAccessToken(),
      }),
      upload: async ({ operations }) => {
        const token = await this.session().getAccessToken();
        const response = await fetch(`${this.apiUrl}/api/powersync/upload`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ operations }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw Object.assign(
            new Error(
              payload?.error?.message ?? "Synchronization upload failed",
            ),
            {
              code: payload?.error?.code,
              conflict: payload?.error?.conflict,
            },
          );
        }
      },
    });
    try {
      await client.powerSync.connect(connector);
    } catch (error) {
      this.set({
        ...this.current,
        status: "failed",
        error: error instanceof Error ? error.message : "Sync failed",
      });
    }
  }
  async disconnect() {
    await this.client?.powerSync.disconnect();
    this.set({ ...this.current, status: "offline" });
  }
  async close() {
    await this.client?.powerSync.close();
    this.client = null;
    this.value = null;
  }
  async remove(userId: string) {
    if (!this.client) await this.open(userId);
    await this.client?.powerSync.disconnectAndClear({ clearLocal: true });
    await this.close();
  }
  async activateRestore(userId: string, datasetId: string, snapshot: Backup) {
    await this.close();
    if (snapshot.user.id !== userId)
      throw new Error("Restore owner does not match the active session");
    const client = createMobileDatabase({
      filename: `expense-tracker-restored-${datasetId}.db`,
    });
    await restoreBackupSnapshot(client.db, snapshot);
    this.client = client;
    this.value = createOfflineServices(client.db);
    this.set({
      status: "not-configured",
      lastSyncedAt: null,
      pendingWrites: 0,
      error:
        "Viewing an isolated restored dataset. Synchronization is disabled.",
    });
  }
  state() {
    return this.current;
  }
  subscribe(listener: (state: ApplicationSyncState) => void) {
    this.listeners.add(listener);
    listener(this.current);
    return () => this.listeners.delete(listener);
  }
  private set(value: ApplicationSyncState) {
    this.current = value;
    for (const listener of this.listeners) listener(value);
  }
}
