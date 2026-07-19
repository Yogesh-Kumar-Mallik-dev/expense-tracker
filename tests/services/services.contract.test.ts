import assert from "node:assert/strict";
import test from "node:test";
import {
  AccountService,
  PermanentSyncConflictError,
  ReportingService,
  TransactionService,
  isPermanentSyncConflict,
  partialWorkflow,
  type AccountRecord,
  type AccountRepositoryPort,
  type TransactionRecord,
  type TransactionRepositoryPort,
} from "../../packages/services/src/index";

const USER = "00000000-0000-4000-8000-000000000001";
const ACCOUNT = "00000000-0000-4000-8000-000000000002";
const TX = "00000000-0000-4000-8000-000000000003";
const clock = () => "2026-07-16T00:00:00.000Z";

function expenseRecord(
  id: string,
  currency: string,
  occurredAt = clock(),
): TransactionRecord {
  return {
    id,
    userId: USER,
    accountId: ACCOUNT,
    transferAccountId: null,
    categoryId: null,
    type: "EXPENSE",
    amount: "4.2500",
    currency,
    description: null,
    note: null,
    occurredAt,
    createdAt: clock(),
    updatedAt: clock(),
    deletedAt: null,
  };
}

class MemoryAccountRepository implements AccountRepositoryPort {
  rows = new Map<string, AccountRecord>();
  async create(v: AccountRecord) {
    this.rows.set(v.id, v);
  }
  async findById(id: string, u: string) {
    const v = this.rows.get(id);
    return v?.userId === u && !v.deletedAt ? v : null;
  }
  async listByUser(u: string, a = false) {
    return [...this.rows.values()].filter(
      (v) => v.userId === u && !v.deletedAt && (a || !v.isArchived),
    );
  }
  async update(
    id: string,
    u: string,
    v: Parameters<AccountRepositoryPort["update"]>[2],
  ) {
    const old = await this.findById(id, u);
    if (old) this.rows.set(id, { ...old, ...v });
  }
  async delete(id: string, u: string) {
    const old = await this.findById(id, u);
    if (old) this.rows.set(id, { ...old, deletedAt: clock() });
  }
}
class MemoryTransactionRepository implements TransactionRepositoryPort {
  rows = new Map<string, TransactionRecord>();
  pageOffset = -1;
  pageTotalOverride: number | null = null;
  async create(v: TransactionRecord) {
    this.rows.set(v.id, v);
  }
  async findById(id: string, u: string) {
    const v = this.rows.get(id);
    return v?.userId === u && !v.deletedAt ? v : null;
  }
  async listByUser(u: string) {
    return [...this.rows.values()].filter(
      (v) => v.userId === u && !v.deletedAt,
    );
  }
  async listPageByUser(
    u: string,
    filters: {
      offset: number;
      limit: number;
    },
  ) {
    this.pageOffset = filters.offset;
    const values = await this.listByUser(u);
    return {
      items: values.slice(filters.offset, filters.offset + filters.limit),
      total: this.pageTotalOverride ?? values.length,
    };
  }
  async update(
    id: string,
    u: string,
    v: Parameters<TransactionRepositoryPort["update"]>[2],
  ) {
    const old = await this.findById(id, u);
    if (old) this.rows.set(id, { ...old, ...v });
  }
  async delete(id: string, u: string) {
    const old = await this.findById(id, u);
    if (old) this.rows.set(id, { ...old, deletedAt: clock() });
  }
  async restore(id: string, u: string, updatedAt: string) {
    const old = this.rows.get(id);
    if (old?.userId === u)
      this.rows.set(id, { ...old, deletedAt: null, updatedAt });
  }
}

for (const adapterName of ["main-contract", "offline-contract"]) {
  test(`${adapterName}: UUID-first creation and tombstone parity`, async () => {
    const accounts = new MemoryAccountRepository();
    const service = new AccountService(accounts, () => ACCOUNT, clock);
    const created = await service.create({
      userId: USER,
      name: "Cash",
      currency: "USD",
    });
    assert.equal(created.id, ACCOUNT);
    await service.delete(ACCOUNT, USER);
    assert.equal(await service.get(ACCOUNT, USER), null);
    assert.equal(accounts.rows.size, 1);
  });
  test(`${adapterName}: transaction remains independent of tags and attachments`, async () => {
    const repository = new MemoryTransactionRepository();
    const service = new TransactionService(repository, () => TX, clock);
    await service.create({
      userId: USER,
      accountId: ACCOUNT,
      transferAccountId: null,
      categoryId: null,
      type: "EXPENSE",
      amount: "2.5000",
      currency: "USD",
      description: null,
      note: null,
      occurredAt: clock(),
    });
    assert.equal(repository.rows.size, 1);
    await assert.rejects(
      service.create({
        userId: USER,
        accountId: ACCOUNT,
        transferAccountId: null,
        categoryId: null,
        type: "EXPENSE",
        amount: "0.0000",
        currency: "USD",
        description: null,
        note: null,
        occurredAt: clock(),
      }),
    );
  });
}

test("reporting derives balances and transfers without persisted counters", async () => {
  const account = (id: string, openingBalance: string): AccountRecord => ({
    id,
    userId: USER,
    name: id,
    type: "CASH",
    currency: "USD",
    openingBalance,
    color: null,
    icon: null,
    isArchived: false,
    createdAt: clock(),
    updatedAt: clock(),
    deletedAt: null,
  });
  const a = account(ACCOUNT, "10.0000"),
    b = account("00000000-0000-4000-8000-000000000004", "0.0000");
  const tx: TransactionRecord = {
    id: TX,
    userId: USER,
    accountId: a.id,
    transferAccountId: b.id,
    categoryId: null,
    type: "TRANSFER",
    amount: "3.2500",
    currency: "USD",
    description: null,
    note: null,
    occurredAt: clock(),
    createdAt: clock(),
    updatedAt: clock(),
    deletedAt: null,
  };
  const reports = new ReportingService({
    listAccounts: async () => [a, b],
    listTransactions: async () => [tx],
    listBudgets: async () => [],
    listBudgetCategories: async () => [],
    listEnvelopeAllocations: async () => [],
    listBudgetTransfers: async () => [],
  });
  assert.deepEqual(
    (await reports.accountBalances(USER)).map((v) => v.balance),
    ["6.7500", "3.2500"],
  );
});

test("transaction paging uses repository total instead of truncating before pagination", async () => {
  const repository = new MemoryTransactionRepository();
  repository.pageTotalOverride = 137;
  const service = new TransactionService(repository);
  const page = await service.page(USER, { offset: 50, limit: 25 });
  assert.equal(repository.pageOffset, 50);
  assert.equal(page.total, 137);
  assert.deepEqual(page.items, []);
});

test("transaction tombstones can be restored by their owner", async () => {
  const repository = new MemoryTransactionRepository();
  const service = new TransactionService(repository, () => TX, clock);
  await service.create({
    userId: USER,
    accountId: ACCOUNT,
    transferAccountId: null,
    categoryId: null,
    type: "EXPENSE",
    amount: "1.0000",
    currency: "USD",
    description: null,
    note: null,
    occurredAt: clock(),
  });
  await service.delete(TX, USER);
  assert.equal(await service.get(TX, USER), null);
  assert.equal((await service.restore(TX, USER)).id, TX);
});

test("reporting derives budget usage and reports currency exclusions", async () => {
  const budgetId = "00000000-0000-4000-8000-000000000005",
    categoryId = "00000000-0000-4000-8000-000000000006";
  const expense = (id: string, currency: string): TransactionRecord => ({
    id,
    userId: USER,
    accountId: ACCOUNT,
    transferAccountId: null,
    categoryId,
    type: "EXPENSE",
    amount: "4.2500",
    currency,
    description: null,
    note: null,
    occurredAt: clock(),
    createdAt: clock(),
    updatedAt: clock(),
    deletedAt: null,
  });
  const reports = new ReportingService({
    listAccounts: async () => [],
    listTransactions: async () => [
      expense(TX, "USD"),
      expense("00000000-0000-4000-8000-000000000007", "EUR"),
    ],
    listBudgets: async () => [
      {
        id: budgetId,
        userId: USER,
        name: "Food",
        amount: "10.0000",
        currency: "USD",
        startsOn: "2026-07-01",
        endsOn: "2026-07-31",
        mode: "SPENDING_LIMIT",
        rolloverPolicy: "NONE",
        createdAt: clock(),
        updatedAt: clock(),
        deletedAt: null,
      },
    ],
    listBudgetCategories: async () => [
      {
        id: "00000000-0000-4000-8000-000000000008",
        budgetId,
        categoryId,
        createdAt: clock(),
        deletedAt: null,
      },
    ],
    listEnvelopeAllocations: async () => [],
    listBudgetTransfers: async () => [],
  });
  const [usage] = await reports.budgetUsage(USER, "2026-07-01", "2026-07-31");
  assert.equal(usage?.spent, "4.2500");
  assert.equal(usage?.remaining, "5.7500");
  assert.equal(usage?.excludedTransactionIds.length, 1);
});

test("period and category reports group complete source records by currency", async () => {
  const categoryId = "00000000-0000-4000-8000-000000000006";
  const transaction = (
    id: string,
    type: TransactionRecord["type"],
    amount: string,
    currency: string,
  ): TransactionRecord => ({
    id,
    userId: USER,
    accountId: ACCOUNT,
    transferAccountId: null,
    categoryId: type === "EXPENSE" ? categoryId : null,
    type,
    amount,
    currency,
    description: null,
    note: null,
    occurredAt: clock(),
    createdAt: clock(),
    updatedAt: clock(),
    deletedAt: null,
  });
  const reports = new ReportingService({
    listAccounts: async () => [],
    listTransactions: async () => [
      transaction(
        "00000000-0000-4000-8000-000000000011",
        "INCOME",
        "10",
        "USD",
      ),
      transaction(
        "00000000-0000-4000-8000-000000000012",
        "EXPENSE",
        "3.25",
        "USD",
      ),
      transaction(
        "00000000-0000-4000-8000-000000000013",
        "EXPENSE",
        "5",
        "INR",
      ),
    ],
    listBudgets: async () => [],
    listBudgetCategories: async () => [],
    listEnvelopeAllocations: async () => [],
    listBudgetTransfers: async () => [],
  });
  assert.deepEqual(await reports.periodSpending(USER, clock(), clock()), [
    {
      currency: "INR",
      income: "0.0000",
      expenses: "5.0000",
      net: "-5.0000",
      transactionCount: 1,
    },
    {
      currency: "USD",
      income: "10.0000",
      expenses: "3.2500",
      net: "6.7500",
      transactionCount: 2,
    },
  ]);
  assert.deepEqual(await reports.categorySpending(USER, clock(), clock()), [
    { categoryId, currency: "INR", amount: "5.0000", transactionCount: 1 },
    { categoryId, currency: "USD", amount: "3.2500", transactionCount: 1 },
  ]);
});

test("envelope usage applies period boundaries and positive-only rollover", async () => {
  const budgetId = "00000000-0000-4000-8000-000000000021";
  const categoryId = "00000000-0000-4000-8000-000000000022";
  const transaction = (
    id: string,
    occurredAt: string,
    amount: string,
  ): TransactionRecord => ({
    id,
    userId: USER,
    accountId: ACCOUNT,
    transferAccountId: null,
    categoryId,
    type: "EXPENSE",
    amount,
    currency: "USD",
    description: null,
    note: null,
    occurredAt,
    createdAt: occurredAt,
    updatedAt: occurredAt,
    deletedAt: null,
  });
  const reports = new ReportingService({
    listAccounts: async () => [],
    listTransactions: async () => [
      transaction(
        "00000000-0000-4000-8000-000000000023",
        "2026-06-20T12:00:00.000Z",
        "3.0000",
      ),
      transaction(
        "00000000-0000-4000-8000-000000000024",
        "2026-07-10T12:00:00.000Z",
        "2.0000",
      ),
    ],
    listBudgets: async () => [
      {
        id: budgetId,
        userId: USER,
        name: "Food",
        amount: "20.0000",
        currency: "USD",
        startsOn: "2026-06-01",
        endsOn: "2026-07-31",
        mode: "ENVELOPE",
        rolloverPolicy: "POSITIVE_ONLY",
        createdAt: clock(),
        updatedAt: clock(),
        deletedAt: null,
      },
    ],
    listBudgetCategories: async () => [
      {
        id: "00000000-0000-4000-8000-000000000025",
        budgetId,
        categoryId,
        createdAt: clock(),
        deletedAt: null,
      },
    ],
    listEnvelopeAllocations: async () => [
      {
        id: "00000000-0000-4000-8000-000000000026",
        budgetId,
        categoryId,
        amount: "10.0000",
        occurredAt: "2026-06-10",
        note: null,
        createdAt: clock(),
        deletedAt: null,
      },
      {
        id: "00000000-0000-4000-8000-000000000027",
        budgetId,
        categoryId,
        amount: "5.0000",
        occurredAt: "2026-07-02",
        note: null,
        createdAt: clock(),
        deletedAt: null,
      },
    ],
    listBudgetTransfers: async () => [],
  });
  const [usage] = await reports.budgetUsage(USER, "2026-07-01", "2026-07-31");
  assert.equal(usage?.assigned, "5.0000");
  assert.equal(usage?.spent, "2.0000");
  assert.equal(usage?.available, "10.0000");
});

test("partial workflows and permanent conflicts remain explicit", () => {
  assert.deepEqual(
    partialWorkflow(TX, ["transaction"], ["tags", "attachment"]),
    {
      primaryRecordId: TX,
      completedSteps: ["transaction"],
      pendingSteps: ["tags", "attachment"],
    },
  );
  const error = new PermanentSyncConflictError({
    kind: "UNIQUE_CONSTRAINT",
    entity: "Account",
    recordId: ACCOUNT,
    message: "Duplicate name",
    fields: ["name"],
    recovery: "RENAME",
  });
  assert.equal(isPermanentSyncConflict(error), true);
});

test("net-worth history preserves currencies and ignores transfers", async () => {
  const reports = new ReportingService({
    listAccounts: async () => [
      {
        id: ACCOUNT,
        userId: USER,
        name: "Cash",
        type: "CASH",
        currency: "USD",
        openingBalance: "10.0000",
        color: null,
        icon: null,
        isArchived: false,
        createdAt: "2026-07-01T00:00:00.000Z",
        updatedAt: clock(),
        deletedAt: null,
      },
    ],
    listTransactions: async () => [
      {
        id: TX,
        userId: USER,
        accountId: ACCOUNT,
        transferAccountId: null,
        categoryId: null,
        type: "EXPENSE",
        amount: "2.5000",
        currency: "USD",
        description: null,
        note: null,
        occurredAt: "2026-07-02T12:00:00.000Z",
        createdAt: clock(),
        updatedAt: clock(),
        deletedAt: null,
      },
    ],
    listBudgets: async () => [],
    listBudgetCategories: async () => [],
    listEnvelopeAllocations: async () => [],
    listBudgetTransfers: async () => [],
  });
  assert.deepEqual(
    await reports.netWorthHistory(USER, "2026-07-01", "2026-07-02"),
    [
      { date: "2026-07-01", currency: "USD", balance: "10.0000" },
      { date: "2026-07-02", currency: "USD", balance: "7.5000" },
    ],
  );
});

test("budget usage classifies midnight transactions in the financial timezone", async () => {
  const budgetId = "00000000-0000-4000-8000-000000000030";
  const categoryId = "00000000-0000-4000-8000-000000000031";
  let queriedFrom = "";
  const reports = new ReportingService({
    listAccounts: async () => [],
    listTransactions: async (_user, from) => {
      queriedFrom = from ?? "";
      return [
        {
          ...expenseRecord("00000000-0000-4000-8000-000000000032", "INR"),
          categoryId,
          occurredAt: "2026-07-18T18:30:00.000Z",
        },
        {
          ...expenseRecord("00000000-0000-4000-8000-000000000033", "INR"),
          categoryId,
          occurredAt: "2026-07-18T18:29:59.999Z",
        },
      ];
    },
    listBudgets: async () => [
      {
        id: budgetId,
        userId: USER,
        name: "Food",
        amount: "10.0000",
        currency: "INR",
        startsOn: "2026-07-19",
        endsOn: "2026-07-19",
        mode: "SPENDING_LIMIT",
        rolloverPolicy: "NONE",
        createdAt: clock(),
        updatedAt: clock(),
        deletedAt: null,
      },
    ],
    listBudgetCategories: async () => [
      {
        id: "00000000-0000-4000-8000-000000000034",
        budgetId,
        categoryId,
        createdAt: clock(),
        deletedAt: null,
      },
    ],
    listEnvelopeAllocations: async () => [],
    listBudgetTransfers: async () => [],
  });

  const [usage] = await reports.budgetUsage(
    USER,
    "2026-07-19",
    "2026-07-19",
    "Asia/Kolkata",
  );
  assert.equal(queriedFrom, "2026-07-18T18:30:00.000Z");
  assert.equal(usage?.spent, "4.2500");
});

test("net-worth history uses financial day cutoffs across DST", async () => {
  const reports = new ReportingService({
    listAccounts: async () => [
      {
        id: ACCOUNT,
        userId: USER,
        name: "Cash",
        type: "CASH",
        currency: "USD",
        openingBalance: "10.0000",
        color: null,
        icon: null,
        isArchived: false,
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: clock(),
        deletedAt: null,
      },
    ],
    listTransactions: async () => [
      {
        ...expenseRecord(TX, "USD"),
        occurredAt: "2026-03-09T03:59:59.999Z",
      },
      {
        ...expenseRecord("00000000-0000-4000-8000-000000000035", "USD"),
        occurredAt: "2026-03-09T04:00:00.000Z",
      },
    ],
    listBudgets: async () => [],
    listBudgetCategories: async () => [],
    listEnvelopeAllocations: async () => [],
    listBudgetTransfers: async () => [],
  });

  assert.deepEqual(
    await reports.netWorthHistory(
      USER,
      "2026-03-08",
      "2026-03-09",
      "America/New_York",
    ),
    [
      { date: "2026-03-08", currency: "USD", balance: "5.7500" },
      { date: "2026-03-09", currency: "USD", balance: "1.5000" },
    ],
  );
});
