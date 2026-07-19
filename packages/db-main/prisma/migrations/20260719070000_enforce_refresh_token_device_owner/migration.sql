ALTER TABLE "Device"
ADD CONSTRAINT "Device_id_userId_key" UNIQUE ("id", "userId");

UPDATE "RefreshToken" AS token
SET "deviceId" = NULL
WHERE token."deviceId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "Device" AS device
    WHERE device.id = token."deviceId"
      AND device."userId" = token."userId"
  );

ALTER TABLE "RefreshToken"
DROP CONSTRAINT "RefreshToken_deviceId_fkey";

ALTER TABLE "RefreshToken"
ADD CONSTRAINT "RefreshToken_deviceId_userId_fkey"
FOREIGN KEY ("deviceId", "userId")
REFERENCES "Device" ("id", "userId")
ON DELETE CASCADE
ON UPDATE CASCADE;
