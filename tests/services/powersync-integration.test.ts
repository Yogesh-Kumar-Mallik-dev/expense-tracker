import assert from "node:assert/strict";
import test from "node:test";
import {
  OfflineBackendConnector,
  type UploadTransaction,
} from "../../packages/db-offline/src/index";
import {
  OfflineExpenseClient,
  type ExpenseDataClient,
} from "../../packages/client-core/src/index";

type Operation = UploadTransaction["operations"][number];

function queuedDatabase(groups: Operation[][]) {
  const transactions = groups.map((crud, index) => ({
    id: `crud-${index + 1}`,
    crud,
    completed: 0,
    async complete() {
      this.completed += 1;
    },
  }));
  return {
    transactions,
    database: {
      async *getCrudTransactions() {
        for (const transaction of transactions)
          if (transaction.completed === 0) yield transaction;
      },
    },
  };
}

function accountOperation(
  op: "PUT" | "PATCH" | "DELETE",
  id: string,
  data?: Record<string, unknown>,
) {
  return {
    op,
    table: "Account",
    id,
    ...(data ? { data } : {}),
  } as Operation;
}

test("retryable upload failures stay queued and complete after retry", async () => {
  const queue = queuedDatabase([
    [accountOperation("PUT", "account-1", { name: "Cash" })],
  ]);
  let attempts = 0;
  const connector = new OfflineBackendConnector({
    credentials: async () => null,
    upload: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("network unavailable");
    },
  });

  await assert.rejects(
    connector.uploadData(queue.database as never),
    /network unavailable/,
  );
  assert.equal(queue.transactions[0]?.completed, 0);

  await connector.uploadData(queue.database as never);
  assert.equal(attempts, 2);
  assert.equal(queue.transactions[0]?.completed, 1);
});

test("permanent conflicts are recorded once and removed from the retry queue", async () => {
  const queue = queuedDatabase([
    [accountOperation("PUT", "account-2", { name: "Cash" })],
  ]);
  const conflicts = new Set<string>();
  const connector = new OfflineBackendConnector({
    credentials: async () => null,
    upload: async () => {
      throw Object.assign(new Error("name already exists"), {
        code: "PERMANENT_SYNC_CONFLICT",
        conflict: { kind: "UNIQUE_CONSTRAINT", recovery: "RENAME_OR_MERGE" },
      });
    },
    onPermanentConflict: async ({ crudTransactionId, operations }) => {
      for (const operation of operations)
        conflicts.add(
          `${crudTransactionId}:${operation.table}:${operation.id}:${operation.op}`,
        );
    },
  });

  await connector.uploadData(queue.database as never);
  await connector.uploadData(queue.database as never);

  assert.equal(conflicts.size, 1);
  assert.equal(queue.transactions[0]?.completed, 1);
});

interface SyncedAccount {
  id: string;
  name: string;
  deletedAt: string | null;
}

class Authority {
  readonly rows = new Map<string, SyncedAccount>();

  async upload({ operations }: UploadTransaction) {
    for (const operation of operations) {
      const current = this.rows.get(operation.id);
      const data = (operation as Operation & { data?: Record<string, unknown> })
        .data;
      if (operation.op === "PUT") {
        const name = String(data?.name);
        if (current) {
          if (current.name === name) continue;
          throw permanentConflict("ID_COLLISION");
        }
        if (
          [...this.rows.values()].some(
            (row) => row.name === name && row.deletedAt === null,
          )
        )
          throw permanentConflict("UNIQUE_CONSTRAINT");
        this.rows.set(operation.id, {
          id: operation.id,
          name,
          deletedAt: null,
        });
      } else if (operation.op === "PATCH" && current) {
        current.name = String(data?.name ?? current.name);
      } else if (operation.op === "DELETE" && current) {
        current.deletedAt = "2026-07-19T00:00:00.000Z";
      }
    }
  }

  restore(id: string) {
    const row = this.rows.get(id);
    if (row) row.deletedAt = null;
  }
}

class Device {
  readonly rows = new Map<string, SyncedAccount>();
  readonly conflicts = new Set<string>();
  private pending: Operation[][] = [];

  constructor(private readonly authority: Authority) {}

  create(id: string, name: string) {
    this.rows.set(id, { id, name, deletedAt: null });
    this.pending.push([accountOperation("PUT", id, { name })]);
  }

  rename(id: string, name: string) {
    const row = this.rows.get(id);
    if (row) row.name = name;
    this.pending.push([accountOperation("PATCH", id, { name })]);
  }

  delete(id: string) {
    const row = this.rows.get(id);
    if (row) row.deletedAt = "local-pending";
    this.pending.push([accountOperation("DELETE", id)]);
  }

  async synchronize() {
    const queue = queuedDatabase(this.pending);
    const connector = new OfflineBackendConnector({
      credentials: async () => null,
      upload: (transaction) => this.authority.upload(transaction),
      onPermanentConflict: async ({ crudTransactionId, operations }) => {
        for (const operation of operations)
          this.conflicts.add(
            `${crudTransactionId}:${operation.table}:${operation.id}:${operation.op}`,
          );
      },
    });
    await connector.uploadData(queue.database as never);
    this.pending = [];
    this.pull();
  }

  pull() {
    this.rows.clear();
    for (const [id, row] of this.authority.rows) this.rows.set(id, { ...row });
  }
}

function permanentConflict(kind: string) {
  return Object.assign(new Error("permanent synchronization conflict"), {
    code: "PERMANENT_SYNC_CONFLICT",
    conflict: { kind, recovery: "RENAME_OR_MERGE" },
  });
}

test("two devices converge through create, edit, tombstone, and restore", async () => {
  const authority = new Authority();
  const first = new Device(authority);
  const second = new Device(authority);

  first.create("account-a", "Cash");
  await first.synchronize();
  second.pull();
  assert.equal(second.rows.get("account-a")?.name, "Cash");

  second.rename("account-a", "Daily cash");
  await second.synchronize();
  first.pull();
  assert.equal(first.rows.get("account-a")?.name, "Daily cash");

  first.delete("account-a");
  await first.synchronize();
  second.pull();
  assert.notEqual(second.rows.get("account-a")?.deletedAt, null);

  authority.restore("account-a");
  first.pull();
  second.pull();
  assert.equal(first.rows.get("account-a")?.deletedAt, null);
  assert.equal(second.rows.get("account-a")?.deletedAt, null);
});

test("same PUT replay is idempotent and naming conflicts do not retry", async () => {
  const authority = new Authority();
  const first = new Device(authority);
  const second = new Device(authority);

  first.create("account-a", "Cash");
  await first.synchronize();
  await authority.upload({
    operations: [accountOperation("PUT", "account-a", { name: "Cash" })],
  });
  assert.equal(authority.rows.size, 1);

  second.create("account-b", "Cash");
  await second.synchronize();
  await second.synchronize();
  assert.equal(second.conflicts.size, 1);
  assert.equal(authority.rows.size, 1);
});

test("fresh login with no local CRUD produces no upload", async () => {
  const queue = queuedDatabase([]);
  let uploads = 0;
  const connector = new OfflineBackendConnector({
    credentials: async () => null,
    upload: async () => {
      uploads += 1;
    },
  });
  await connector.uploadData(queue.database as never);
  assert.equal(uploads, 0);
});

test("transaction restore uses the authoritative endpoint", async () => {
  let restored = "";
  const remote = {
    restoreTransaction: async (id: string) => {
      restored = id;
      return {
        data: {
          id,
        },
      };
    },
  } as unknown as ExpenseDataClient;
  const client = new OfflineExpenseClient(
    () => {
      throw new Error("local services must not restore a server tombstone");
    },
    () => "user-1",
    remote,
  );

  await client.restoreTransaction("transaction-1");
  assert.equal(restored, "transaction-1");
});
