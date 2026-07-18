import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import test, { after, afterEach, before, beforeEach } from "node:test";
import React from "react";
import { JSDOM } from "jsdom";
import { formatMoney } from "../../packages/ui-web/ui-src/src/money";
import {
  ApiError,
  fingerprintTransactionCsvRow,
  previewTransactionCsv,
  RestExpenseClient,
  ResponseValidationError,
  writeTransactionCsv,
  type Account,
  type RegistrationInput,
  type ExpenseDataClient,
  type SessionController,
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
    timezone: "Asia/Kolkata",
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
    crypto: webcrypto,
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
  Object.defineProperty(globalThis, "requestAnimationFrame", {
    configurable: true,
    value: (callback: FrameRequestCallback) => setTimeout(callback, 0),
  });
  Object.defineProperty(globalThis, "cancelAnimationFrame", {
    configurable: true,
    value: (id: number) => clearTimeout(id),
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

test("CSV preview preserves quoted fields and fixed-point money", () => {
  const csv = writeTransactionCsv([
    {
      date: "2026-07-18",
      type: "EXPENSE",
      amount: "9007199254740993.1234",
      currency: "INR",
      account: "Cash",
      transferAccount: "",
      category: "Food",
      description: 'Lunch, "special"',
      note: "receipt\nkept",
    },
  ]);
  const preview = previewTransactionCsv(csv);
  assert.equal(preview.invalid.length, 0);
  assert.equal(preview.valid[0]?.value.amount, "9007199254740993.1234");
  assert.equal(preview.valid[0]?.value.description, 'Lunch, "special"');
});

test("CSV fingerprints are stable and account-specific", async () => {
  const row = previewTransactionCsv(
    "date,type,amount,currency,account,transferAccount,category,description,note\n2026-07-18,EXPENSE,10.00,INR,Cash,,Food,Lunch,\n",
  ).valid[0]!.value;
  const first = await fingerprintTransactionCsvRow(row, {
    accountId: ACCOUNT.id,
    transferAccountId: null,
    categoryId: null,
  });
  assert.equal(first.length, 64);
  assert.equal(
    first,
    await fingerprintTransactionCsvRow(row, {
      accountId: ACCOUNT.id,
      transferAccountId: null,
      categoryId: null,
    }),
  );
  assert.notEqual(
    first,
    await fingerprintTransactionCsvRow(row, {
      accountId: "00000000-0000-4000-8000-000000000099",
      transferAccountId: null,
      categoryId: null,
    }),
  );
});

test("API rejects a successful but invalid response envelope", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json({ data: [{ id: "not-a-uuid" }], meta: META });
  try {
    const api = new RestExpenseClient("http://api.test", {
      getAccessToken: async () => "token",
      refresh: async () => SESSION,
    });
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
  const session = {
    register: async (input: RegistrationInput) => {
      registrations.push(input);
      return SESSION;
    },
  } as unknown as SessionController;

  render(
    <LoginScreen
      session={session}
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

test("transaction register renders populated data and sends server search", async () => {
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
    transactions: async (filters: { search?: string }) => ({
      data: filters.search ? [] : [TRANSACTION],
      meta: filters.search ? { ...META, total: 0, totalPages: 0 } : META,
    }),
  } as unknown as ExpenseDataClient;
  render(
    <TransactionsScreen
      api={api}
      onUnauthorized={() => assert.fail("unexpected unauthorized")}
    />,
  );
  assert.ok(await screen.findByRole("button", { name: "Groceries" }));
  assert.ok(screen.getByRole("columnheader", { name: "Amount" }));
  await user.type(
    screen.getByRole("searchbox", {
      name: "Search transaction descriptions and notes",
    }),
    "missing",
  );
  assert.ok(
    await screen.findByRole("heading", { name: "No matches on this page" }),
  );
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
  } as unknown as ExpenseDataClient;
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
        } as unknown as ExpenseDataClient
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
        } as unknown as ExpenseDataClient
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
  render(
    <SyncScreen
      sync={{
        disconnect: async () => {},
        state: () => ({
          status: "not-configured",
          lastSyncedAt: null,
          pendingWrites: null,
          error: null,
        }),
      }}
    />,
  );
  assert.ok(screen.getByRole("heading", { name: "Synchronization" }));
  assert.match(
    screen.getByText(/Local SQLite remains usable/).textContent ?? "",
    /PowerSync URL/,
  );
  assert.equal(screen.queryByText("Synced"), null);
  assert.equal(screen.queryByText("Connected"), null);
});

test("first account form validates and submits the account contract once", async () => {
  const { render, screen } = await import("@testing-library/react");
  const user = (await import("@testing-library/user-event")).default.setup();
  const { AccountForm } =
    await import("../../packages/ui-web/ui-src/src/screens/account-form");
  const created: unknown[] = [];
  const api = {
    createAccount: async (value: unknown) => {
      created.push(value);
      return { data: ACCOUNT };
    },
  } as unknown as ExpenseDataClient;
  render(
    <AccountForm
      account={null}
      open
      api={api}
      defaultCurrency="INR"
      onOpenChange={() => {}}
      onSaved={async () => {}}
    />,
  );
  await user.type(screen.getByLabelText("Name"), "Everyday account");
  await user.clear(screen.getByLabelText("Opening balance"));
  await user.type(screen.getByLabelText("Opening balance"), "10.1250");
  await user.click(screen.getByRole("button", { name: "Create account" }));
  assert.deepEqual(created, [
    {
      name: "Everyday account",
      type: "CHECKING",
      currency: "INR",
      openingBalance: "10.1250",
    },
  ]);
});
