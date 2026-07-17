import assert from "node:assert/strict";
import test, { after, afterEach, before, beforeEach } from "node:test";
import React from "react";
import { JSDOM } from "jsdom";
import { formatMoney } from "../../packages/ui-web/ui-src/src/money";
import {
  ApiError,
  ExpenseApi,
  ResponseValidationError,
  type Account,
  type RegistrationInput,
  type Session,
  type Transaction,
} from "../../packages/ui-web/ui-src/src/api";

const ACCOUNT: Account = {
  id: "00000000-0000-4000-8000-000000000001",
  userId: "00000000-0000-4000-8000-000000000002",
  name: "Checking",
  type: "CHECKING",
  currency: "INR",
  openingBalance: "0.0000",
  color: null,
  icon: null,
  isArchived: false,
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-18T00:00:00.000Z",
  deletedAt: null,
};
const TRANSACTION: Transaction = {
  id: "00000000-0000-4000-8000-000000000003",
  userId: ACCOUNT.userId,
  accountId: ACCOUNT.id,
  transferAccountId: null,
  categoryId: null,
  type: "EXPENSE",
  amount: "9007199254740993.1250",
  currency: "INR",
  description: "Groceries",
  note: null,
  occurredAt: "2026-07-18T10:00:00.000Z",
  createdAt: "2026-07-18T10:00:00.000Z",
  updatedAt: "2026-07-18T10:00:00.000Z",
  deletedAt: null,
};
const META = {
  page: 1,
  pageSize: 25,
  total: 1,
  totalPages: 1,
  hasNext: false,
  hasPrevious: false,
};
const SESSION: Session = {
  user: {
    id: ACCOUNT.userId,
    email: "person@example.com",
    name: "Example Person",
    currency: "INR",
  },
  tokens: {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresIn: 900,
  },
};

let dom: JSDOM;
before(() => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/#/transactions",
  });
  for (const [name, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    Element: dom.window.Element,
    Node: dom.window.Node,
    MutationObserver: dom.window.MutationObserver,
    getComputedStyle: dom.window.getComputedStyle,
    location: dom.window.location,
    history: dom.window.history,
    crypto: dom.window.crypto,
  })) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value,
    });
  }
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    value: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  });
});
beforeEach(() => {
  document.body.innerHTML = "";
  window.location.hash = "#/transactions";
});
afterEach(async () => {
  const { cleanup } = await import("@testing-library/react");
  cleanup();
});
after(() => {
  dom.window.close();
});

test("money formatting preserves values beyond Number safe integer precision", () => {
  assert.match(
    formatMoney("9007199254740993.1250", "INR", "en-IN"),
    /9,00,71,99,25,47,40,993\.12/,
  );
});

test("API rejects a successful but invalid response envelope", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json({ data: [{ id: "not-a-uuid" }], meta: META });
  try {
    const api = new ExpenseApi("http://api.test", () => "token");
    await assert.rejects(api.accounts(), ResponseValidationError);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("signup validates confirmation and submits the documented registration contract once", async () => {
  const { render, screen } = await import("@testing-library/react");
  const user = (await import("@testing-library/user-event")).default.setup();
  const { LoginScreen } =
    await import("../../packages/ui-web/ui-src/src/screens/login-screen");
  const registrations: RegistrationInput[] = [];
  let authenticated: Session | null = null;
  const api = {
    register: async (input: RegistrationInput) => {
      registrations.push(input);
      return { data: SESSION };
    },
  } as unknown as ExpenseApi;

  render(
    <LoginScreen
      api={api}
      onLogin={(session) => {
        authenticated = session;
      }}
    />,
  );
  await user.click(screen.getByRole("button", { name: "Create one" }));
  await user.type(screen.getByLabelText("Name"), "Example Person");
  await user.type(screen.getByLabelText("Email"), "person@example.com");
  await user.type(screen.getByLabelText("Password"), "a-secure-password");
  await user.type(screen.getByLabelText("Confirm password"), "different");
  await user.click(screen.getByRole("button", { name: "Create account" }));
  assert.ok(screen.getByRole("alert"));
  assert.equal(registrations.length, 0);

  await user.clear(screen.getByLabelText("Confirm password"));
  await user.type(
    screen.getByLabelText("Confirm password"),
    "a-secure-password",
  );
  await user.click(screen.getByRole("button", { name: "Create account" }));
  assert.equal(registrations.length, 1);
  assert.deepEqual(registrations[0], {
    email: "person@example.com",
    password: "a-secure-password",
    name: "Example Person",
    currency: "INR",
  });
  assert.equal(authenticated, SESSION);
});

test("transaction register renders populated data and filters the current page", async () => {
  const { render, screen } = await import("@testing-library/react");
  const user = (await import("@testing-library/user-event")).default.setup();
  const { TransactionsScreen } =
    await import("../../packages/ui-web/ui-src/src/screens/transactions-screen");
  const api = {
    accounts: async () => ({ data: [ACCOUNT], meta: META }),
    categories: async () => ({
      data: [],
      meta: { ...META, total: 0, totalPages: 0 },
    }),
    transactions: async () => ({ data: [TRANSACTION], meta: META }),
  } as unknown as ExpenseApi;
  render(
    <TransactionsScreen
      api={api}
      onUnauthorized={() => assert.fail("unexpected unauthorized")}
    />,
  );
  assert.ok(await screen.findByRole("button", { name: "Groceries" }));
  assert.ok(screen.getByRole("columnheader", { name: "Amount" }));
  await user.type(
    screen.getByRole("searchbox", { name: "Search transactions on this page" }),
    "missing",
  );
  assert.ok(screen.getByRole("heading", { name: "No matches on this page" }));
});

test("transaction register keeps a truthful empty state", async () => {
  const { render, screen } = await import("@testing-library/react");
  const { TransactionsScreen } =
    await import("../../packages/ui-web/ui-src/src/screens/transactions-screen");
  const api = {
    accounts: async () => ({ data: [ACCOUNT], meta: META }),
    categories: async () => ({
      data: [],
      meta: { ...META, total: 0, totalPages: 0 },
    }),
    transactions: async () => ({
      data: [],
      meta: { ...META, total: 0, totalPages: 0 },
    }),
  } as unknown as ExpenseApi;
  render(<TransactionsScreen api={api} onUnauthorized={() => {}} />);
  assert.ok(
    await screen.findByRole("heading", {
      name: "No transactions in this range",
    }),
  );
  assert.equal(
    screen.getAllByRole("button", { name: "Add transaction" }).length,
    2,
  );
});

test("transaction failure is recoverable and authentication expiry is separate", async () => {
  const { render, screen, waitFor } = await import("@testing-library/react");
  const { TransactionsScreen } =
    await import("../../packages/ui-web/ui-src/src/screens/transactions-screen");
  const references = {
    accounts: async () => ({ data: [ACCOUNT], meta: META }),
    categories: async () => ({ data: [], meta: META }),
  };
  render(
    <TransactionsScreen
      api={
        {
          ...references,
          transactions: async () => {
            throw new Error("Network unavailable");
          },
        } as unknown as ExpenseApi
      }
      onUnauthorized={() => {}}
    />,
  );
  assert.ok(await screen.findByText("Network unavailable"));
  assert.ok(screen.getByRole("button", { name: "Try again" }));
  let unauthorized = false;
  render(
    <TransactionsScreen
      api={
        {
          ...references,
          transactions: async () => {
            throw new ApiError(401, "Expired");
          },
        } as unknown as ExpenseApi
      }
      onUnauthorized={() => {
        unauthorized = true;
      }}
    />,
  );
  await waitFor(() => assert.equal(unauthorized, true));
});

test("synchronization screen never fabricates online or synced state", async () => {
  const { render, screen } = await import("@testing-library/react");
  const { SyncScreen } =
    await import("../../packages/ui-web/ui-src/src/screens/supporting-screens");
  render(<SyncScreen />);
  assert.ok(screen.getByRole("heading", { name: "Synchronization" }));
  assert.match(
    screen.getByText(/Unavailable until/).textContent ?? "",
    /PowerSync connection state/,
  );
  assert.equal(screen.queryByText("Synced"), null);
  assert.equal(screen.queryByText("Connected"), null);
});
