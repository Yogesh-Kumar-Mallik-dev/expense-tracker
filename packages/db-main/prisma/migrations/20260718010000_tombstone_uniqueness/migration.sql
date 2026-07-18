DROP INDEX IF EXISTS "Account_userId_name_key";
DROP INDEX IF EXISTS "Category_userId_name_type_key";
DROP INDEX IF EXISTS "Tag_userId_name_key";
DROP INDEX IF EXISTS "Budget_userId_name_startsOn_endsOn_key";

CREATE UNIQUE INDEX "Account_userId_name_active_key"
ON "Account" ("userId", "name")
WHERE "deletedAt" IS NULL;

CREATE UNIQUE INDEX "Category_userId_name_type_active_key"
ON "Category" ("userId", "name", "type")
WHERE "deletedAt" IS NULL;

CREATE UNIQUE INDEX "Tag_userId_name_active_key"
ON "Tag" ("userId", "name")
WHERE "deletedAt" IS NULL;

CREATE UNIQUE INDEX "Budget_userId_name_period_active_key"
ON "Budget" ("userId", "name", "startsOn", "endsOn")
WHERE "deletedAt" IS NULL;
