ALTER TABLE "UserActivity" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Department" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Location" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "ShiftTemplate" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "ShiftInstance" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "ShiftAttendance" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "TimeOffRequest" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Membership" ADD COLUMN "departmentId" TEXT;
ALTER TABLE "Membership" ADD COLUMN "locationId" TEXT;

UPDATE "UserActivity" SET "organizationId" = 'org_default';
UPDATE "Department" SET "organizationId" = 'org_default';
UPDATE "Location" SET "organizationId" = 'org_default';
UPDATE "ShiftTemplate" SET "organizationId" = 'org_default';
UPDATE "ShiftInstance" SET "organizationId" = 'org_default';
UPDATE "ShiftAttendance" SET "organizationId" = 'org_default';
UPDATE "TimeOffRequest" SET "organizationId" = 'org_default';
UPDATE "Membership" m SET "departmentId" = u."departmentId", "locationId" = u."locationId" FROM "User" u WHERE u."id" = m."userId" AND m."organizationId" = 'org_default';

ALTER TABLE "UserActivity" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Department" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Location" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "ShiftTemplate" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "ShiftInstance" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "ShiftAttendance" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "TimeOffRequest" ALTER COLUMN "organizationId" SET NOT NULL;

ALTER TABLE "UserActivity" ADD CONSTRAINT "UserActivity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Department" ADD CONSTRAINT "Department_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Location" ADD CONSTRAINT "Location_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShiftTemplate" ADD CONSTRAINT "ShiftTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShiftInstance" ADD CONSTRAINT "ShiftInstance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShiftAttendance" ADD CONSTRAINT "ShiftAttendance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeOffRequest" ADD CONSTRAINT "TimeOffRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "UserActivity_organizationId_timestamp_idx" ON "UserActivity"("organizationId", "timestamp");
CREATE INDEX "Department_organizationId_name_idx" ON "Department"("organizationId", "name");
CREATE INDEX "Location_organizationId_name_idx" ON "Location"("organizationId", "name");
CREATE INDEX "ShiftTemplate_organizationId_locationId_idx" ON "ShiftTemplate"("organizationId", "locationId");
CREATE INDEX "ShiftTemplate_organizationId_userId_idx" ON "ShiftTemplate"("organizationId", "userId");
CREATE INDEX "ShiftInstance_organizationId_locationId_date_idx" ON "ShiftInstance"("organizationId", "locationId", "date");
CREATE INDEX "ShiftInstance_organizationId_userId_date_idx" ON "ShiftInstance"("organizationId", "userId", "date");
CREATE INDEX "ShiftAttendance_organizationId_userId_checkInAt_idx" ON "ShiftAttendance"("organizationId", "userId", "checkInAt");
CREATE INDEX "ShiftAttendance_organizationId_locationId_checkInAt_idx" ON "ShiftAttendance"("organizationId", "locationId", "checkInAt");
CREATE INDEX "TimeOffRequest_organizationId_userId_status_idx" ON "TimeOffRequest"("organizationId", "userId", "status");
CREATE INDEX "TimeOffRequest_organizationId_status_startDate_idx" ON "TimeOffRequest"("organizationId", "status", "startDate");
CREATE INDEX "Membership_organizationId_departmentId_idx" ON "Membership"("organizationId", "departmentId");
CREATE INDEX "Membership_organizationId_locationId_idx" ON "Membership"("organizationId", "locationId");

CREATE UNIQUE INDEX "Department_organization_name_active_key" ON "Department"("organizationId", lower("name")) WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "Location_organization_name_active_key" ON "Location"("organizationId", lower("name")) WHERE "deletedAt" IS NULL;

DROP INDEX IF EXISTS "UserActivity_timestamp_idx";
DROP INDEX IF EXISTS "ShiftTemplate_locationId_idx";
DROP INDEX IF EXISTS "ShiftTemplate_userId_idx";
DROP INDEX IF EXISTS "ShiftInstance_locationId_date_idx";
DROP INDEX IF EXISTS "ShiftInstance_userId_date_idx";
DROP INDEX IF EXISTS "ShiftAttendance_userId_checkInAt_idx";
DROP INDEX IF EXISTS "ShiftAttendance_locationId_checkInAt_idx";
DROP INDEX IF EXISTS "TimeOffRequest_userId_status_idx";
DROP INDEX IF EXISTS "TimeOffRequest_status_startDate_idx";

ALTER TABLE "User" DROP CONSTRAINT "User_departmentId_fkey";
ALTER TABLE "User" DROP CONSTRAINT "User_locationId_fkey";
ALTER TABLE "User" DROP COLUMN "departmentId";
ALTER TABLE "User" DROP COLUMN "locationId";
