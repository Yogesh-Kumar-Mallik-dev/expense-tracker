CREATE TABLE `Account` (
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
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Account_userId_name_key` ON `Account` (`userId`,`name`);--> statement-breakpoint
CREATE INDEX `Account_userId_isArchived_idx` ON `Account` (`userId`,`isArchived`);--> statement-breakpoint
CREATE TABLE `Attachment` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`transactionId` text NOT NULL,
	`fileName` text NOT NULL,
	`storageKey` text NOT NULL,
	`mimeType` text NOT NULL,
	`sizeBytes` integer NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Attachment_storageKey_unique` ON `Attachment` (`storageKey`);--> statement-breakpoint
CREATE INDEX `Attachment_transactionId_idx` ON `Attachment` (`transactionId`);--> statement-breakpoint
CREATE INDEX `Attachment_userId_idx` ON `Attachment` (`userId`);--> statement-breakpoint
CREATE TABLE `Budget` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`amount` text NOT NULL,
	`currency` text(3) NOT NULL,
	`startsOn` text NOT NULL,
	`endsOn` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Budget_userId_name_startsOn_endsOn_key` ON `Budget` (`userId`,`name`,`startsOn`,`endsOn`);--> statement-breakpoint
CREATE INDEX `Budget_userId_startsOn_endsOn_idx` ON `Budget` (`userId`,`startsOn`,`endsOn`);--> statement-breakpoint
CREATE TABLE `BudgetCategory` (
	`id` text PRIMARY KEY NOT NULL,
	`budgetId` text NOT NULL,
	`categoryId` text NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`budgetId`) REFERENCES `Budget`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `BudgetCategory_budgetId_categoryId_key` ON `BudgetCategory` (`budgetId`,`categoryId`);--> statement-breakpoint
CREATE INDEX `BudgetCategory_categoryId_idx` ON `BudgetCategory` (`categoryId`);--> statement-breakpoint
CREATE TABLE `Category` (
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
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Category_userId_name_type_key` ON `Category` (`userId`,`name`,`type`);--> statement-breakpoint
CREATE INDEX `Category_userId_type_isArchived_idx` ON `Category` (`userId`,`type`,`isArchived`);--> statement-breakpoint
CREATE INDEX `Category_parentId_idx` ON `Category` (`parentId`);--> statement-breakpoint
CREATE TABLE `Device` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`platform` text NOT NULL,
	`lastSeenAt` text NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Device_userId_idx` ON `Device` (`userId`);--> statement-breakpoint
CREATE TABLE `RefreshToken` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`deviceId` text,
	`tokenHash` text NOT NULL,
	`expiresAt` text NOT NULL,
	`revokedAt` text,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deviceId`) REFERENCES `Device`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `RefreshToken_tokenHash_unique` ON `RefreshToken` (`tokenHash`);--> statement-breakpoint
CREATE INDEX `RefreshToken_userId_expiresAt_idx` ON `RefreshToken` (`userId`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `RefreshToken_deviceId_idx` ON `RefreshToken` (`deviceId`);--> statement-breakpoint
CREATE TABLE `SyncState` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`deviceId` text NOT NULL,
	`lastSyncedAt` text,
	`checkpoint` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deviceId`) REFERENCES `Device`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `SyncState_deviceId_unique` ON `SyncState` (`deviceId`);--> statement-breakpoint
CREATE INDEX `SyncState_userId_idx` ON `SyncState` (`userId`);--> statement-breakpoint
CREATE TABLE `Tag` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`color` text(7),
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Tag_userId_name_key` ON `Tag` (`userId`,`name`);--> statement-breakpoint
CREATE INDEX `Tag_userId_idx` ON `Tag` (`userId`);--> statement-breakpoint
CREATE TABLE `TransactionTag` (
	`id` text PRIMARY KEY NOT NULL,
	`transactionId` text NOT NULL,
	`tagId` text NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tagId`) REFERENCES `Tag`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `TransactionTag_transactionId_tagId_key` ON `TransactionTag` (`transactionId`,`tagId`);--> statement-breakpoint
CREATE INDEX `TransactionTag_tagId_idx` ON `TransactionTag` (`tagId`);--> statement-breakpoint
CREATE TABLE `Transaction` (
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
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`transferAccountId`) REFERENCES `Account`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `Transaction_userId_occurredAt_idx` ON `Transaction` (`userId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `Transaction_accountId_occurredAt_idx` ON `Transaction` (`accountId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `Transaction_categoryId_occurredAt_idx` ON `Transaction` (`categoryId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `Transaction_transferAccountId_idx` ON `Transaction` (`transferAccountId`);--> statement-breakpoint
CREATE TABLE `User` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`currency` text(3) DEFAULT 'USD' NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `User_email_unique` ON `User` (`email`);--> statement-breakpoint
CREATE INDEX `User_email_idx` ON `User` (`email`);