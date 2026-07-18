import { invoke } from "@tauri-apps/api/core";
import {
  createOfflineServices,
  PersistentAttachmentQueue,
  restoreBackupSnapshot,
  users,
  type OfflineServices,
} from "@expense-tracker/db-offline";
import { createDesktopDatabase } from "@expense-tracker/db-offline/driver/desktop";
import {
  stableUserDatabaseIdentity,
  type ApplicationSyncState,
  type LocalDatabaseLifecycle,
  type SessionController,
  type SyncController,
  type ExpenseDataClient,
  type Backup,
} from "@expense-tracker/client-core";

export class DesktopOfflineRuntime
  implements LocalDatabaseLifecycle, SyncController
{
  private client: ReturnType<typeof createDesktopDatabase> | null = null;
  private value: OfflineServices | null = null;
  private current: ApplicationSyncState = {
    status: "offline",
    lastSyncedAt: null,
    pendingWrites: null,
    error: null,
  };
  private listeners = new Set<(state: ApplicationSyncState) => void>();
  private unsubscribeSession: (() => void) | null = null;
  private remote: ExpenseDataClient | null = null;
  private queue: PersistentAttachmentQueue | null = null;
  private onlineHandler = () => void this.queue?.drain();

  constructor(
    private readonly session: () => SessionController,
    private readonly apiUrl: string,
  ) {}
  services() {
    if (!this.value) throw new Error("Local database is not ready");
    return this.value;
  }
  setRemote(remote: ExpenseDataClient) {
    this.remote = remote;
  }
  attachments() {
    if (!this.queue) throw new Error("Attachment queue is not ready");
    return this.queue;
  }
  identityFor(userId: string) {
    return stableUserDatabaseIdentity(userId);
  }
  async open(userId: string) {
    await this.close();
    const client = createDesktopDatabase({
      filename: await this.identityFor(userId),
    });
    await client.powerSync.init();
    this.client = client;
    this.value = createOfflineServices(client.db);
    this.queue = new PersistentAttachmentQueue(
      client.db,
      userId,
      async (transactionId, file, attachmentId) => {
        if (!this.remote)
          throw new Error("Remote attachment service is unavailable");
        await this.remote.uploadAttachment(transactionId, file, attachmentId);
      },
      (pendingWrites) => this.set({ ...this.current, pendingWrites }),
    );
    window.addEventListener("online", this.onlineHandler);
    void this.queue.drain();
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
            updatedAt: now,
          },
        });
      await invoke("connect_powersync", {
        handle: client.powerSync.rustHandle,
        apiUrl: this.apiUrl,
        accessToken: auth.session.tokens.accessToken,
      });
    }
    this.unsubscribeSession = this.session().subscribe((state) => {
      if (state.status === "authenticated")
        void invoke("update_powersync_access_token", {
          accessToken: state.session.tokens.accessToken,
        });
    });
    client.powerSync.registerListener({
      statusChanged: (status) =>
        this.set({
          status:
            status.dataFlowStatus.uploadError ||
            status.dataFlowStatus.downloadError
              ? "failed"
              : status.dataFlowStatus.uploading ||
                  status.dataFlowStatus.downloading
                ? "synchronizing"
                : status.connected
                  ? "synchronized"
                  : status.connecting
                    ? "connecting"
                    : "offline",
          lastSyncedAt: status.lastSyncedAt?.toISOString() ?? null,
          pendingWrites: this.current.pendingWrites,
          error:
            status.dataFlowStatus.uploadError?.message ??
            status.dataFlowStatus.downloadError?.message ??
            null,
        }),
    });
  }
  async disconnect() {
    await this.client?.powerSync.disconnect();
    this.set({ ...this.current, status: "offline" });
  }
  async close() {
    this.unsubscribeSession?.();
    this.unsubscribeSession = null;
    await this.client?.powerSync.close();
    this.client = null;
    this.value = null;
    this.queue = null;
    window.removeEventListener("online", this.onlineHandler);
  }
  async remove(userId: string) {
    if (!this.client) await this.open(userId);
    await this.queue?.clear();
    await this.client?.powerSync.disconnectAndClear({ clearLocal: true });
    await this.close();
  }
  async activateRestore(userId: string, datasetId: string, snapshot: Backup) {
    await this.close();
    if (snapshot.user.id !== userId)
      throw new Error("Restore owner does not match the active session");
    const client = createDesktopDatabase({
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
