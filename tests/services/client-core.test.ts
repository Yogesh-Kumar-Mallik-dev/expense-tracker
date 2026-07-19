import assert from "node:assert/strict";
import test from "node:test";
import {
  ApplicationSessionController,
  MemoryCredentialStore,
  RestAuthenticationTransport,
  stableUserDatabaseIdentity,
  type AuthenticationTransport,
  type Session,
} from "../../packages/client-core/src/index";

const session: Session = {
  user: {
    id: "00000000-0000-4000-8000-000000000001",
    email: "person@example.com",
    name: null,
    currency: "INR",
    timezone: "Asia/Kolkata",
  },
  tokens: {
    accessToken: "access",
    refreshToken: "refresh-next",
    expiresIn: 900,
  },
};

test("session refresh is single-flight and rotates the stored credential", async () => {
  let refreshes = 0;
  const credentials = new MemoryCredentialStore();
  await credentials.write("refresh-current");
  const transport = {
    refresh: async () => {
      refreshes += 1;
      await Promise.resolve();
      return session;
    },
  } as unknown as AuthenticationTransport;
  const controller = new ApplicationSessionController({
    transport,
    credentials,
  });

  const [first, second] = await Promise.all([
    controller.refresh(),
    controller.refresh(),
  ]);

  assert.equal(refreshes, 1);
  assert.equal(first, second);
  assert.equal(await credentials.read(), "refresh-next");
});

test("session restoration recovers when secure credential storage is unavailable", async () => {
  const controller = new ApplicationSessionController({
    transport: {
      refresh: async () => {
        throw new Error("refresh must not run");
      },
    } as unknown as AuthenticationTransport,
    credentials: {
      read: async () => {
        throw new Error("credential bridge unavailable");
      },
      write: async () => {},
      clear: async () => {
        throw new Error("credential bridge unavailable");
      },
    },
  });

  const state = await controller.restore();

  assert.equal(state.status, "anonymous");
});

test("per-user database identities are stable and isolated", async () => {
  const first = await stableUserDatabaseIdentity(
    "00000000-0000-4000-8000-000000000001",
  );
  const repeated = await stableUserDatabaseIdentity(
    "00000000-0000-4000-8000-000000000001",
  );
  const second = await stableUserDatabaseIdentity(
    "00000000-0000-4000-8000-000000000002",
  );

  assert.equal(first, repeated);
  assert.notEqual(first, second);
  assert.match(first, /^expense-tracker-[a-f0-9]{24}\.db$/);
});

test("login resolves a device through the normalized user identity", async () => {
  const previousFetch = globalThis.fetch;
  let resolvedEmail = "";
  let requestBody: Record<string, unknown> = {};
  globalThis.fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({ data: session }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const transport = new RestAuthenticationTransport(
      "https://api.example.test",
      "direct",
      async (email) => {
        resolvedEmail = email;
        return "00000000-0000-4000-8000-000000000003";
      },
    );
    await transport.login("Person@Example.COM", "password");
    assert.equal(resolvedEmail, "person@example.com");
    assert.equal(requestBody.deviceId, "00000000-0000-4000-8000-000000000003");
  } finally {
    globalThis.fetch = previousFetch;
  }
});
