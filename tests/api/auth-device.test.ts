import assert from "node:assert/strict";
import test from "node:test";
import { issueTokens, ownedDeviceId } from "../../apps/api/src/auth";

const userId = "00000000-0000-4000-8000-000000000001";
const otherUserId = "00000000-0000-4000-8000-000000000002";
const deviceId = "00000000-0000-4000-8000-000000000003";

function fakeTokenClient(ownerId: string) {
  const created: Record<string, unknown>[] = [];
  return {
    created,
    client: {
      device: {
        findFirst: async ({
          where,
        }: {
          where: { id: string; userId: string; deletedAt: null };
        }) =>
          where.id === deviceId && where.userId === ownerId
            ? { id: deviceId }
            : null,
      },
      refreshToken: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          created.push(data);
          return data;
        },
      },
    },
  };
}

test("refresh sessions only retain devices owned by the same user", async () => {
  process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
  process.env.ACCESS_TOKEN_SECRET ??= "a".repeat(32);
  process.env.REFRESH_TOKEN_SECRET ??= "b".repeat(32);

  const owned = fakeTokenClient(userId);
  assert.equal(
    await ownedDeviceId(owned.client as never, userId, deviceId),
    deviceId,
  );
  const tokens = await issueTokens(userId, deviceId, owned.client as never);
  assert.equal(owned.created[0]?.deviceId, deviceId);
  assert.equal(tokens.deviceId, deviceId);

  const foreign = fakeTokenClient(otherUserId);
  assert.equal(
    await ownedDeviceId(foreign.client as never, userId, deviceId),
    null,
  );
  const foreignTokens = await issueTokens(
    userId,
    deviceId,
    foreign.client as never,
  );
  assert.equal("deviceId" in (foreign.created[0] ?? {}), false);
  assert.equal(foreignTokens.deviceId, null);
});
