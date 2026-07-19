import {
  OfflineBackendConnector,
  createHttpCredentialsProvider,
  createOfflineServices,
  PersistentAttachmentQueue,
  restoreBackupSnapshot,
  type OfflineServices,
} from "@expense-tracker/db-offline";
import { createWebDatabase } from "@expense-tracker/db-offline/driver/web";
import { syncConflicts } from "@expense-tracker/db-offline";
import type {
  ApplicationSyncState,
  LocalDatabaseLifecycle,
  SessionController,
  SyncController,
  ExpenseDataClient,
  Backup,
} from "@expense-tracker/client-core";

export class WebOfflineRuntime
  implements LocalDatabaseLifecycle, SyncController
{
  private client: ReturnType<typeof createWebDatabase> | null = null;
  private value: OfflineServices | null = null;
  private current: ApplicationSyncState = {
    status: "offline",
    lastSyncedAt: null,
    pendingWrites: null,
    error: null,
  };
  private listeners = new Set<(state: ApplicationSyncState) => void>();
  private remote: ExpenseDataClient | null = null;
  private queue: PersistentAttachmentQueue | null = null;
  private onlineHandler = () => void this.queue?.drain();

  constructor(private readonly session: () => SessionController) {}

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
    return import("@expense-tracker/client-core").then(
      ({ stableUserDatabaseIdentity }) => stableUserDatabaseIdentity(userId),
    );
  }
  async open(userId: string) {
    await this.close();
    const filename = await this.identityFor(userId);
    const client = createWebDatabase({ filename, enableMultiTabs: true });
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
    client.powerSync.registerListener({
      statusChanged: (status) => {
        const flow = status.dataFlowStatus;
        this.set({
          status:
            flow.downloadError || flow.uploadError
              ? "failed"
              : flow.downloading || flow.uploading
                ? "synchronizing"
                : status.connected && status.hasSynced
                  ? "synchronized"
                  : status.connecting
                    ? "connecting"
                    : "offline",
          lastSyncedAt: status.lastSyncedAt?.toISOString() ?? null,
          pendingWrites: this.current.pendingWrites,
          error:
            flow.uploadError?.message ?? flow.downloadError?.message ?? null,
        });
      },
    });
    const connector = new OfflineBackendConnector({
      credentials: createHttpCredentialsProvider({
        endpoint: "/backend/api/powersync/credentials",
        getAccessToken: () => this.session().getAccessToken(),
      }),
      upload: async ({ operations }) => {
        const token = await this.session().getAccessToken();
        const response = await fetch("/backend/api/powersync/upload", {
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
      onPermanentConflict: async ({ crudTransactionId, error, operations }) => {
        const conflict =
          error && typeof error === "object" && "conflict" in error
            ? (error.conflict as Record<string, unknown>)
            : {};
        const now = new Date().toISOString();
        await client.db.insert(syncConflicts).values(
          operations.map((operation) => ({
            id: crypto.randomUUID(),
            crudTransactionId,
            entity: operation.table,
            recordId: operation.id,
            operation: operation.op,
            kind: typeof conflict.kind === "string" ? conflict.kind : "UNKNOWN",
            fields: JSON.stringify(
              Array.isArray(conflict.fields) ? conflict.fields : [],
            ),
            message:
              error instanceof Error
                ? error.message
                : "Synchronization conflict",
            recovery:
              typeof conflict.recovery === "string"
                ? conflict.recovery
                : "REVIEW",
            createdAt: now,
            resolvedAt: null,
          })),
        );
        this.set({
          ...this.current,
          status: "failed",
          error:
            "A permanent synchronization conflict requires review in the local conflict store.",
        });
      },
    });
    try {
      await client.powerSync.connect(connector);
    } catch (caught) {
      this.set({
        status:
          caught instanceof Error && caught.message.includes("503")
            ? "not-configured"
            : "failed",
        lastSyncedAt: null,
        pendingWrites: this.current.pendingWrites,
        error:
          caught instanceof Error ? caught.message : "Synchronization failed",
      });
    }
  }
  async disconnect() {
    await this.client?.powerSync.disconnect();
    this.set({ ...this.current, status: "offline" });
  }
  async close() {
    if (!this.client) return;
    await this.client.powerSync.close();
    this.client = null;
    this.value = null;
    this.queue = null;
    window.removeEventListener("online", this.onlineHandler);
  }
  async remove(userId: string) {
    if (!this.client) {
      await this.open(userId);
    }
    await this.queue?.clear();
    await this.client?.powerSync.disconnectAndClear({ clearLocal: true });
    await this.close();
  }
  async activateRestore(userId: string, datasetId: string, snapshot: Backup) {
    await this.close();
    if (snapshot.user.id !== userId)
      throw new Error("Restore owner does not match the active session");
    const client = createWebDatabase({
      filename: `expense-tracker-restored-${datasetId}.db`,
      enableMultiTabs: true,
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
