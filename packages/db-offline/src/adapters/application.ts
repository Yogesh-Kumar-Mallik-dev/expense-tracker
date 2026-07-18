import {
  AccountService,
  AttachmentService,
  BudgetActivityService,
  BudgetCategoryService,
  BudgetService,
  CategoryService,
  DeviceService,
  ReportingService,
  TagService,
  TransactionService,
  TransactionTagService,
  UserService,
} from "@expense-tracker/services";
import type { OfflineDatabase } from "../database";
import {
  AccountRepository,
  AttachmentRepository,
  BudgetCategoryRepository,
  BudgetRepository,
  CategoryRepository,
  DeviceRepository,
  TagRepository,
  TransactionRepository,
  TransactionTagRepository,
  UserRepository,
} from "../repositories";
import {
  OfflineAccountAdapter,
  OfflineAttachmentAdapter,
  OfflineBudgetActivityAdapter,
  OfflineBudgetAdapter,
  OfflineBudgetCategoryAdapter,
  OfflineCategoryAdapter,
  OfflineDeviceAdapter,
  OfflineReportingAdapter,
  OfflineTagAdapter,
  OfflineTransactionAdapter,
  OfflineTransactionTagAdapter,
  OfflineUserAdapter,
} from "./services";

export function createOfflineServices(db: OfflineDatabase) {
  const budgetRepository = new OfflineBudgetAdapter(new BudgetRepository(db));
  return {
    accounts: new AccountService(
      new OfflineAccountAdapter(new AccountRepository(db)),
    ),
    attachments: new AttachmentService(
      new OfflineAttachmentAdapter(new AttachmentRepository(db)),
    ),
    budgets: new BudgetService(budgetRepository),
    budgetActivity: new BudgetActivityService(
      new OfflineBudgetActivityAdapter(db),
      budgetRepository,
    ),
    budgetCategories: new BudgetCategoryService(
      new OfflineBudgetCategoryAdapter(new BudgetCategoryRepository(db)),
    ),
    categories: new CategoryService(
      new OfflineCategoryAdapter(new CategoryRepository(db)),
    ),
    devices: new DeviceService(
      new OfflineDeviceAdapter(new DeviceRepository(db)),
    ),
    reporting: new ReportingService(new OfflineReportingAdapter(db)),
    tags: new TagService(new OfflineTagAdapter(new TagRepository(db))),
    transactions: new TransactionService(
      new OfflineTransactionAdapter(new TransactionRepository(db)),
    ),
    transactionTags: new TransactionTagService(
      new OfflineTransactionTagAdapter(new TransactionTagRepository(db)),
    ),
    users: new UserService(new OfflineUserAdapter(new UserRepository(db))),
  };
}

export type OfflineServices = ReturnType<typeof createOfflineServices>;
