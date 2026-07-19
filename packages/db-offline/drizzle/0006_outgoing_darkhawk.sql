DELETE FROM `SyncConflict`
WHERE `rowid` NOT IN (
  SELECT MIN(`rowid`)
  FROM `SyncConflict`
  GROUP BY `crudTransactionId`, `entity`, `recordId`, `operation`
);--> statement-breakpoint
CREATE UNIQUE INDEX `SyncConflict_operation_unique` ON `SyncConflict` (`crudTransactionId`,`entity`,`recordId`,`operation`);
