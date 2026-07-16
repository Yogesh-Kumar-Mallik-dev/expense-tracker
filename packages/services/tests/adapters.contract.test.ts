import assert from "node:assert/strict";
import test from "node:test";
import {
  AccountService,
  type AccountRecord,
  type AccountRepositoryPort,
} from "../src/index";

process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
const USER = "00000000-0000-4000-8000-000000000011",
  ACCOUNT = "00000000-0000-4000-8000-000000000012",
  NOW = "2026-07-16T00:00:00.000Z";

// Concurrency note: N/A - test-only fixture conversion with no persisted state.
function prismaRow(value: AccountRecord) {
  return {
    ...value,
    openingBalance: { toString: () => value.openingBalance },
    createdAt: new Date(value.createdAt),
    updatedAt: new Date(value.updatedAt),
    deletedAt: value.deletedAt ? new Date(value.deletedAt) : null,
  };
}

// Concurrency note: N/A - contract harness invokes only public single-row service operations.
async function accountContract(repository: AccountRepositoryPort) {
  const service = new AccountService(
    repository,
    () => ACCOUNT,
    () => NOW,
  );
  const created = await service.create({
    userId: USER,
    name: "Wallet",
    currency: "usd",
    openingBalance: "1.2500",
  });
  assert.equal(created.currency, "USD");
  assert.equal((await service.get(ACCOUNT, USER))?.openingBalance, "1.2500");
  await service.delete(ACCOUNT, USER);
  assert.equal(await service.get(ACCOUNT, USER), null);
}

test("real offline and main adapters satisfy the same service contract", async () => {
  const [{ OfflineAccountAdapter }, { MainAccountAdapter }] = await Promise.all(
    [
      import("../../db-offline/src/adapters/services"),
      import("../../db-main/src/adapters/services"),
    ],
  );
  const offlineRows = new Map<string, AccountRecord>();
  const offlineRepository = {
    create: async (v: AccountRecord) => {
      offlineRows.set(v.id, v);
    },
    findById: async (id: string, u: string) => {
      const v = offlineRows.get(id);
      return v?.userId === u && !v.deletedAt ? v : null;
    },
    listByUser: async () => [...offlineRows.values()],
    update: async () => {},
    delete: async (id: string) => {
      const v = offlineRows.get(id);
      if (v) offlineRows.set(id, { ...v, deletedAt: NOW });
    },
  };
  const mainRows = new Map<string, AccountRecord>();
  const db = {
    account: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const id = String(data.id);
        mainRows.set(id, {
          id,
          userId: String(data.userId),
          name: String(data.name),
          type: data.type as AccountRecord["type"],
          currency: String(data.currency),
          openingBalance: String(data.openingBalance),
          color: data.color as string | null,
          icon: data.icon as string | null,
          isArchived: Boolean(data.isArchived),
          createdAt: (data.createdAt as Date).toISOString(),
          updatedAt: (data.updatedAt as Date).toISOString(),
          deletedAt: null,
        });
      },
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        const v = mainRows.get(String(where.id));
        return v && !v.deletedAt ? prismaRow(v) : null;
      },
      findMany: async () =>
        [...mainRows.values()].filter((v) => !v.deletedAt).map(prismaRow),
      updateMany: async ({
        where,
        data,
      }: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => {
        const v = mainRows.get(String(where.id));
        if (v)
          mainRows.set(v.id, {
            ...v,
            deletedAt:
              data.deletedAt instanceof Date
                ? data.deletedAt.toISOString()
                : v.deletedAt,
          });
      },
    },
  };
  await accountContract(new OfflineAccountAdapter(offlineRepository as never));
  await accountContract(new MainAccountAdapter(db as never));
});
