import {
  AccountService,
  AttachmentService,
  BudgetCategoryService,
  BudgetActivityService,
  BudgetService,
  CategoryService,
  DeviceService,
  ReportingService,
  TagService,
  TransactionService,
  TransactionTagService,
  UserService,
} from "@expense-tracker/services";
import {
  MainAccountAdapter,
  MainAttachmentAdapter,
  MainBudgetAdapter,
  MainBudgetActivityAdapter,
  MainBudgetCategoryAdapter,
  MainCategoryAdapter,
  MainDeviceAdapter,
  MainReportingAdapter,
  MainTagAdapter,
  MainTransactionAdapter,
  MainTransactionTagAdapter,
  MainUserAdapter,
} from "@expense-tracker/db-main/adapters/services";

const budgetRepository = new MainBudgetAdapter();

export const services = {
  accounts: new AccountService(new MainAccountAdapter()),
  attachments: new AttachmentService(new MainAttachmentAdapter()),
  budgets: new BudgetService(budgetRepository),
  budgetActivity: new BudgetActivityService(
    new MainBudgetActivityAdapter(),
    budgetRepository,
  ),
  budgetCategories: new BudgetCategoryService(new MainBudgetCategoryAdapter()),
  categories: new CategoryService(new MainCategoryAdapter()),
  devices: new DeviceService(new MainDeviceAdapter()),
  reporting: new ReportingService(new MainReportingAdapter()),
  tags: new TagService(new MainTagAdapter()),
  transactions: new TransactionService(new MainTransactionAdapter()),
  transactionTags: new TransactionTagService(new MainTransactionTagAdapter()),
  users: new UserService(
    new MainUserAdapter(async () => {
      throw new Error(
        "User credentials must be created through the auth routes",
      );
    }),
  ),
};
