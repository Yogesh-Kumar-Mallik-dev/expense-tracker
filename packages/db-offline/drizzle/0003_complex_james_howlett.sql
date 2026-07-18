CREATE TABLE `PendingAttachmentUpload` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`attachmentId` text NOT NULL,
	`transactionId` text NOT NULL,
	`localUri` text NOT NULL,
	`fileName` text NOT NULL,
	`mimeType` text NOT NULL,
	`sizeBytes` integer NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`lastError` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `PendingAttachmentUpload_attachmentId_unique` ON `PendingAttachmentUpload` (`attachmentId`);--> statement-breakpoint
CREATE INDEX `PendingAttachmentUpload_userId_status_idx` ON `PendingAttachmentUpload` (`userId`,`status`);--> statement-breakpoint
CREATE TABLE `SyncConflict` (
	`id` text PRIMARY KEY NOT NULL,
	`crudTransactionId` text NOT NULL,
	`entity` text NOT NULL,
	`recordId` text NOT NULL,
	`operation` text NOT NULL,
	`kind` text NOT NULL,
	`fields` text DEFAULT '[]' NOT NULL,
	`message` text NOT NULL,
	`recovery` text NOT NULL,
	`createdAt` text NOT NULL,
	`resolvedAt` text
);
--> statement-breakpoint
CREATE INDEX `SyncConflict_recordId_idx` ON `SyncConflict` (`entity`,`recordId`);--> statement-breakpoint
CREATE INDEX `SyncConflict_resolvedAt_idx` ON `SyncConflict` (`resolvedAt`);--> statement-breakpoint
DROP TABLE `RefreshToken`;--> statement-breakpoint
DROP INDEX `Account_userId_name_key`;--> statement-breakpoint
CREATE UNIQUE INDEX `Account_userId_name_active_key` ON `Account` (`userId`,`name`) WHERE "Account"."deletedAt" is null;--> statement-breakpoint
DROP INDEX `Budget_userId_name_startsOn_endsOn_key`;--> statement-breakpoint
CREATE UNIQUE INDEX `Budget_userId_name_period_active_key` ON `Budget` (`userId`,`name`,`startsOn`,`endsOn`) WHERE "Budget"."deletedAt" is null;--> statement-breakpoint
DROP INDEX `Category_userId_name_type_key`;--> statement-breakpoint
CREATE UNIQUE INDEX `Category_userId_name_type_active_key` ON `Category` (`userId`,`name`,`type`) WHERE "Category"."deletedAt" is null;--> statement-breakpoint
DROP INDEX `Tag_userId_name_key`;--> statement-breakpoint
CREATE UNIQUE INDEX `Tag_userId_name_active_key` ON `Tag` (`userId`,`name`) WHERE "Tag"."deletedAt" is null;