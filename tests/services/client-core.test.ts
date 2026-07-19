import assert from "node:assert/strict";
import test from "node:test";
import {
  ApplicationSessionController,
  financialDayRange,
  MemoryCredentialStore,
  RestAuthenticationTransport,
  RestExpenseClient,
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

test("financial day boundaries use the configured timezone", () => {
  assert.deepEqual(
    financialDayRange("2026-07-19", "2026-07-19", "Asia/Kolkata"),
    {
      from: "2026-07-18T18:30:00.000Z",
      to: "2026-07-19T18:29:59.999Z",
    },
  );
});

test("financial day boundaries preserve DST day length", () => {
  assert.deepEqual(
    financialDayRange("2026-03-08", "2026-03-08", "America/New_York"),
    {
      from: "2026-03-08T05:00:00.000Z",
      to: "2026-03-09T03:59:59.999Z",
    },
  );
  assert.throws(
    () => financialDayRange("2026-02-30", "2026-03-01", "UTC"),
    /Invalid financial date/,
  );
});

test("REST transaction filters use the financial timezone", async () => {
  const previousFetch = globalThis.fetch;
  let requestedUrl = "";
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return Response.json({
      data: [],
      meta: {
        page: 1,
        pageSize: 25,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      },
    });
  };
  try {
    const client = new RestExpenseClient(
      "https://api.example.test",
      {
        getAccessToken: async () => "access",
        refresh: async () => session,
      },
      () => "Asia/Kolkata",
    );
    await client.transactions({
      page: 1,
      pageSize: 25,
      from: "2026-07-19",
      to: "2026-07-19",
    });
    const url = new URL(requestedUrl);
    assert.equal(url.searchParams.get("from"), "2026-07-18T18:30:00.000Z");
    assert.equal(url.searchParams.get("to"), "2026-07-19T18:29:59.999Z");
  } finally {
    globalThis.fetch = previousFetch;
  }
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
