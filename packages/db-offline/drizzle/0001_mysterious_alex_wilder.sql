PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_Account` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'CASH' NOT NULL,
	`currency` text(3) NOT NULL,
	`openingBalance` text DEFAULT '0' NOT NULL,
	`color` text(7),
	`icon` text,
	`isArchived` integer DEFAULT false NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`deletedAt` text,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_Account`("id", "userId", "name", "type", "currency", "openingBalance", "color", "icon", "isArchived", "createdAt", "updatedAt", "deletedAt") SELECT "id", "userId", "name", "type", "currency", "openingBalance", "color", "icon", "isArchived", "createdAt", "updatedAt", "deletedAt" FROM `Account`;--> statement-breakpoint
DROP TABLE `Account`;--> statement-breakpoint
ALTER TABLE `__new_Account` RENAME TO `Account`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `Account_userId_name_key` ON `Account` (`userId`,`name`);--> statement-breakpoint
CREATE INDEX `Account_userId_isArchived_idx` ON `Account` (`userId`,`isArchived`);--> statement-breakpoint
CREATE TABLE `__new_Attachment` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`transactionId` text NOT NULL,
	`fileName` text NOT NULL,
	`storageKey` text NOT NULL,
	`mimeType` text NOT NULL,
	`sizeBytes` integer NOT NULL,
	`createdAt` text NOT NULL,
	`deletedAt` text,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_Attachment`("id", "userId", "transactionId", "fileName", "storageKey", "mimeType", "sizeBytes", "createdAt", "deletedAt") SELECT "id", "userId", "transactionId", "fileName", "storageKey", "mimeType", "sizeBytes", "createdAt", "deletedAt" FROM `Attachment`;--> statement-breakpoint
DROP TABLE `Attachment`;--> statement-breakpoint
ALTER TABLE `__new_Attachment` RENAME TO `Attachment`;--> statement-breakpoint
CREATE UNIQUE INDEX `Attachment_storageKey_unique` ON `Attachment` (`storageKey`);--> statement-breakpoint
CREATE INDEX `Attachment_transactionId_idx` ON `Attachment` (`transactionId`);--> statement-breakpoint
CREATE INDEX `Attachment_userId_idx` ON `Attachment` (`userId`);--> statement-breakpoint
CREATE TABLE `__new_Budget` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`amount` text NOT NULL,
	`currency` text(3) NOT NULL,
	`startsOn` text NOT NULL,
	`endsOn` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`deletedAt` text,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_Budget`("id", "userId", "name", "amount", "currency", "startsOn", "endsOn", "createdAt", "updatedAt", "deletedAt") SELECT "id", "userId", "name", "amount", "currency", "startsOn", "endsOn", "createdAt", "updatedAt", "deletedAt" FROM `Budget`;--> statement-breakpoint
DROP TABLE `Budget`;--> statement-breakpoint
ALTER TABLE `__new_Budget` RENAME TO `Budget`;--> statement-breakpoint
CREATE UNIQUE INDEX `Budget_userId_name_startsOn_endsOn_key` ON `Budget` (`userId`,`name`,`startsOn`,`endsOn`);--> statement-breakpoint
CREATE INDEX `Budget_userId_startsOn_endsOn_idx` ON `Budget` (`userId`,`startsOn`,`endsOn`);--> statement-breakpoint
CREATE TABLE `__new_BudgetCategory` (
	`id` text PRIMARY KEY NOT NULL,
	`budgetId` text NOT NULL,
	`categoryId` text NOT NULL,
	`createdAt` text NOT NULL,
	`deletedAt` text,
	FOREIGN KEY (`budgetId`) REFERENCES `Budget`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_BudgetCategory`("id", "budgetId", "categoryId", "createdAt", "deletedAt") SELECT "id", "budgetId", "categoryId", "createdAt", "deletedAt" FROM `BudgetCategory`;--> statement-breakpoint
DROP TABLE `BudgetCategory`;--> statement-breakpoint
ALTER TABLE `__new_BudgetCategory` RENAME TO `BudgetCategory`;--> statement-breakpoint
CREATE UNIQUE INDEX `BudgetCategory_budgetId_categoryId_key` ON `BudgetCategory` (`budgetId`,`categoryId`);--> statement-breakpoint
CREATE INDEX `BudgetCategory_categoryId_idx` ON `BudgetCategory` (`categoryId`);--> statement-breakpoint
CREATE TABLE `__new_Category` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`parentId` text,
	`name` text NOT NULL,
	`type` text DEFAULT 'EXPENSE' NOT NULL,
	`color` text(7),
	`icon` text,
	`isArchived` integer DEFAULT false NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`deletedAt` text,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_Category`("id", "userId", "parentId", "name", "type", "color", "icon", "isArchived", "createdAt", "updatedAt", "deletedAt") SELECT "id", "userId", "parentId", "name", "type", "color", "icon", "isArchived", "createdAt", "updatedAt", "deletedAt" FROM `Category`;--> statement-breakpoint
DROP TABLE `Category`;--> statement-breakpoint
ALTER TABLE `__new_Category` RENAME TO `Category`;--> statement-breakpoint
CREATE UNIQUE INDEX `Category_userId_name_type_key` ON `Category` (`userId`,`name`,`type`);--> statement-breakpoint
CREATE INDEX `Category_userId_type_isArchived_idx` ON `Category` (`userId`,`type`,`isArchived`);--> statement-breakpoint
CREATE INDEX `Category_parentId_idx` ON `Category` (`parentId`);--> statement-breakpoint
CREATE TABLE `__new_Device` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`platform` text NOT NULL,
	`lastSeenAt` text NOT NULL,
	`createdAt` text NOT NULL,
	`deletedAt` text,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_Device`("id", "userId", "name", "platform", "lastSeenAt", "createdAt", "deletedAt") SELECT "id", "userId", "name", "platform", "lastSeenAt", "createdAt", "deletedAt" FROM `Device`;--> statement-breakpoint
DROP TABLE `Device`;--> statement-breakpoint
ALTER TABLE `__new_Device` RENAME TO `Device`;--> statement-breakpoint
CREATE INDEX `Device_userId_idx` ON `Device` (`userId`);--> statement-breakpoint
CREATE TABLE `__new_SyncState` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`deviceId` text NOT NULL,
	`lastSyncedAt` text,
	`checkpoint` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`deletedAt` text,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`deviceId`) REFERENCES `Device`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_SyncState`("id", "userId", "deviceId", "lastSyncedAt", "checkpoint", "createdAt", "updatedAt", "deletedAt") SELECT "id", "userId", "deviceId", "lastSyncedAt", "checkpoint", "createdAt", "updatedAt", "deletedAt" FROM `SyncState`;--> statement-breakpoint
DROP TABLE `SyncState`;--> statement-breakpoint
ALTER TABLE `__new_SyncState` RENAME TO `SyncState`;--> statement-breakpoint
CREATE UNIQUE INDEX `SyncState_deviceId_unique` ON `SyncState` (`deviceId`);--> statement-breakpoint
CREATE INDEX `SyncState_userId_idx` ON `SyncState` (`userId`);--> statement-breakpoint
CREATE TABLE `__new_Tag` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`color` text(7),
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`deletedAt` text,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_Tag`("id", "userId", "name", "color", "createdAt", "updatedAt", "deletedAt") SELECT "id", "userId", "name", "color", "createdAt", "updatedAt", "deletedAt" FROM `Tag`;--> statement-breakpoint
DROP TABLE `Tag`;--> statement-breakpoint
ALTER TABLE `__new_Tag` RENAME TO `Tag`;--> statement-breakpoint
CREATE UNIQUE INDEX `Tag_userId_name_key` ON `Tag` (`userId`,`name`);--> statement-breakpoint
CREATE INDEX `Tag_userId_idx` ON `Tag` (`userId`);--> statement-breakpoint
CREATE TABLE `__new_TransactionTag` (
	`id` text PRIMARY KEY NOT NULL,
	`transactionId` text NOT NULL,
	`tagId` text NOT NULL,
	`createdAt` text NOT NULL,
	`deletedAt` text,
	FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`tagId`) REFERENCES `Tag`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_TransactionTag`("id", "transactionId", "tagId", "createdAt", "deletedAt") SELECT "id", "transactionId", "tagId", "createdAt", "deletedAt" FROM `TransactionTag`;--> statement-breakpoint
DROP TABLE `TransactionTag`;--> statement-breakpoint
ALTER TABLE `__new_TransactionTag` RENAME TO `TransactionTag`;--> statement-breakpoint
CREATE UNIQUE INDEX `TransactionTag_transactionId_tagId_key` ON `TransactionTag` (`transactionId`,`tagId`);--> statement-breakpoint
CREATE INDEX `TransactionTag_tagId_idx` ON `TransactionTag` (`tagId`);--> statement-breakpoint
CREATE TABLE `__new_Transaction` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`accountId` text NOT NULL,
	`transferAccountId` text,
	`categoryId` text,
	`type` text NOT NULL,
	`amount` text NOT NULL,
	`currency` text(3) NOT NULL,
	`description` text,
	`note` text,
	`occurredAt` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`deletedAt` text,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`transferAccountId`) REFERENCES `Account`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_Transaction`("id", "userId", "accountId", "transferAccountId", "categoryId", "type", "amount", "currency", "description", "note", "occurredAt", "createdAt", "updatedAt", "deletedAt") SELECT "id", "userId", "accountId", "transferAccountId", "categoryId", "type", "amount", "currency", "description", "note", "occurredAt", "createdAt", "updatedAt", "deletedAt" FROM `Transaction`;--> statement-breakpoint
DROP TABLE `Transaction`;--> statement-breakpoint
ALTER TABLE `__new_Transaction` RENAME TO `Transaction`;--> statement-breakpoint
CREATE INDEX `Transaction_userId_occurredAt_idx` ON `Transaction` (`userId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `Transaction_accountId_occurredAt_idx` ON `Transaction` (`accountId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `Transaction_categoryId_occurredAt_idx` ON `Transaction` (`categoryId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `Transaction_transferAccountId_idx` ON `Transaction` (`transferAccountId`);--> statement-breakpoint
ALTER TABLE `User` ADD `deletedAt` text;