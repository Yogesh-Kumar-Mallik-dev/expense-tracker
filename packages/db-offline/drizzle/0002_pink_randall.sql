CREATE TABLE `BudgetTransfer` (
	`id` text PRIMARY KEY NOT NULL,
	`budgetId` text NOT NULL,
	`fromCategoryId` text,
	`toCategoryId` text,
	`amount` text NOT NULL,
	`occurredAt` text NOT NULL,
	`note` text,
	`createdAt` text NOT NULL,
	`deletedAt` text,
	FOREIGN KEY (`budgetId`) REFERENCES `Budget`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `BudgetTransfer_budgetId_occurredAt_idx` ON `BudgetTransfer` (`budgetId`,`occurredAt`);--> statement-breakpoint
CREATE TABLE `EnvelopeAllocation` (
	`id` text PRIMARY KEY NOT NULL,
	`budgetId` text NOT NULL,
	`categoryId` text NOT NULL,
	`amount` text NOT NULL,
	`occurredAt` text NOT NULL,
	`note` text,
	`createdAt` text NOT NULL,
	`deletedAt` text,
	FOREIGN KEY (`budgetId`) REFERENCES `Budget`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `EnvelopeAllocation_budgetId_categoryId_occurredAt_idx` ON `EnvelopeAllocation` (`budgetId`,`categoryId`,`occurredAt`);--> statement-breakpoint
ALTER TABLE `Budget` ADD `mode` text DEFAULT 'SPENDING_LIMIT' NOT NULL;--> statement-breakpoint
ALTER TABLE `Budget` ADD `rolloverPolicy` text DEFAULT 'NONE' NOT NULL;