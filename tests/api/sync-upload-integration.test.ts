import assert from "node:assert/strict";
import test from "node:test";
import {
  applyUploadWithClient,
  uploadSchema,
} from "../../apps/api/src/powersync";
import { HttpError } from "../../apps/api/src/http";

const USER = "00000000-0000-4000-8000-000000000001";
const OTHER_USER = "00000000-0000-4000-8000-000000000002";
const ACCOUNT = "00000000-0000-4000-8000-000000000003";
const NOW = "2026-07-19T00:00:00.000Z";

interface AccountRow {
  id: string;
  userId: string;
  name: string;
  type: string;
  currency: string;
  openingBalance: string;
  color: string | null;
  icon: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

function database(seed: AccountRow[] = []) {
  let committed = new Map(seed.map((row) => [row.id, structuredClone(row)]));
  const client = {
    async $transaction(
      callback: (transaction: Record<string, unknown>) => Promise<void>,
    ) {
      const working = new Map(
        [...committed].map(([id, row]) => [id, structuredClone(row)]),
      );
      const account = {
        async findFirst({ where }: { where: { id: string; userId?: string } }) {
          const row = working.get(where.id);
          if (!row || (where.userId && row.userId !== where.userId))
            return null;
          return row;
        },
        async create({ data }: { data: AccountRow }) {
          if (working.has(data.id))
            throw Object.assign(new Error("duplicate id"), { code: "P2002" });
          working.set(data.id, { ...data, deletedAt: null });
          return data;
        },
        async updateMany({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<AccountRow>;
        }) {
          const row = working.get(where.id);
          if (!row) return { count: 0 };
          working.set(where.id, { ...row, ...data });
          return { count: 1 };
        },
      };
      await callback({ account });
      committed = working;
    },
  };
  return {
    client,
    rows: () => committed,
  };
}

function putAccount(userId = USER, id = ACCOUNT) {
  return uploadSchema.parse({
    operations: [
      {
        op: "PUT",
        table: "Account",
        id,
        data: {
          userId,
          name: "Cash",
          type: "CASH",
          currency: "INR",
          openingBalance: "0.0000",
          color: null,
          icon: null,
          isArchived: false,
          createdAt: NOW,
          updatedAt: NOW,
        },
      },
    ],
  });
}

test("authoritative upload accepts an identical PUT replay", async () => {
  const value = database();
  await applyUploadWithClient(value.client as never, putAccount(), USER);
  await applyUploadWithClient(value.client as never, putAccount(), USER);

  assert.equal(value.rows().size, 1);
  assert.equal(value.rows().get(ACCOUNT)?.name, "Cash");
});

test("authoritative tombstone deletion is repeatable", async () => {
  const value = database();
  await applyUploadWithClient(value.client as never, putAccount(), USER);
  const deletion = uploadSchema.parse({
    operations: [{ op: "DELETE", table: "Account", id: ACCOUNT }],
  });
  await applyUploadWithClient(value.client as never, deletion, USER);
  await applyUploadWithClient(value.client as never, deletion, USER);

  assert.ok(value.rows().get(ACCOUNT)?.deletedAt instanceof Date);
});

test("authoritative upload rejects another user's relationship before write", async () => {
  const value = database([
    {
      id: ACCOUNT,
      userId: OTHER_USER,
      name: "Private",
      type: "CASH",
      currency: "INR",
      openingBalance: "0.0000",
      color: null,
      icon: null,
      isArchived: false,
      createdAt: new Date(NOW),
      updatedAt: new Date(NOW),
      deletedAt: null,
    },
  ]);

  await assert.rejects(
    applyUploadWithClient(value.client as never, putAccount(), USER),
    (error) =>
      error instanceof HttpError && error.code === "SYNC_OWNERSHIP_VIOLATION",
  );
  assert.equal(value.rows().get(ACCOUNT)?.userId, OTHER_USER);
});

test("PATCH returns the same ownership-safe error for missing and foreign IDs", async () => {
  const patch = (id: string) =>
    uploadSchema.parse({
      operations: [
        {
          op: "PATCH",
          table: "Account",
          id,
          data: { name: "Renamed" },
        },
      ],
    });
  const foreignId = ACCOUNT;
  const missingId = "00000000-0000-4000-8000-000000000009";
  const value = database([
    {
      id: foreignId,
      userId: OTHER_USER,
      name: "Private",
      type: "CASH",
      currency: "INR",
      openingBalance: "0.0000",
      color: null,
      icon: null,
      isArchived: false,
      createdAt: new Date(NOW),
      updatedAt: new Date(NOW),
      deletedAt: null,
    },
  ]);

  for (const id of [foreignId, missingId])
    await assert.rejects(
      applyUploadWithClient(value.client as never, patch(id), USER),
      (error) =>
        error instanceof HttpError &&
        error.status === 403 &&
        error.code === "SYNC_OWNERSHIP_VIOLATION" &&
        error.message === "Record is not owned by this user",
    );
});

test("authoritative upload rolls back the complete CRUD batch", async () => {
  const blockedId = "00000000-0000-4000-8000-000000000004";
  const createdId = "00000000-0000-4000-8000-000000000005";
  const value = database([
    {
      id: blockedId,
      userId: OTHER_USER,
      name: "Private",
      type: "CASH",
      currency: "INR",
      openingBalance: "0.0000",
      color: null,
      icon: null,
      isArchived: false,
      createdAt: new Date(NOW),
      updatedAt: new Date(NOW),
      deletedAt: null,
    },
  ]);
  const first = putAccount(USER, createdId).operations[0]!;
  const second = putAccount(USER, blockedId).operations[0]!;

  await assert.rejects(
    applyUploadWithClient(
      value.client as never,
      { operations: [first, second] },
      USER,
    ),
    (error) =>
      error instanceof HttpError && error.code === "SYNC_OWNERSHIP_VIOLATION",
  );

  assert.equal(value.rows().has(createdId), false);
  assert.equal(value.rows().size, 1);
});
