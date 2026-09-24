CREATE TYPE "OrganizationRoleKey" AS ENUM ('ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER');

CREATE TABLE "OrganizationRole" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" "OrganizationRoleKey" NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" TEXT[] NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "OrganizationRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoleAssignment" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "RoleAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationRole_organizationId_key_key" ON "OrganizationRole"("organizationId", "key");
CREATE INDEX "OrganizationRole_organizationId_isActive_idx" ON "OrganizationRole"("organizationId", "isActive");
CREATE UNIQUE INDEX "RoleAssignment_membershipId_key" ON "RoleAssignment"("membershipId");
CREATE INDEX "RoleAssignment_roleId_deletedAt_idx" ON "RoleAssignment"("roleId", "deletedAt");

ALTER TABLE "OrganizationRole"
  ADD CONSTRAINT "OrganizationRole_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RoleAssignment"
  ADD CONSTRAINT "RoleAssignment_membershipId_fkey"
  FOREIGN KEY ("membershipId") REFERENCES "Membership"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RoleAssignment"
  ADD CONSTRAINT "RoleAssignment_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "OrganizationRole"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed the typed role catalog for every existing organization. Stored grants
-- are filtered through the application's typed permission catalog at runtime.
INSERT INTO "OrganizationRole" ("id", "organizationId", "key", "name", "permissions")
SELECT "id" || ':ADMIN', "id", 'ADMIN', 'Admin', ARRAY[
  'users:read','users:write','departments:read','departments:write',
  'locations:read','locations:write','shifts:read','shifts:write',
  'logging:read','timeOff:read','timeOff:write'
]::TEXT[] FROM "Organization";

INSERT INTO "OrganizationRole" ("id", "organizationId", "key", "name", "permissions")
SELECT "id" || ':MANAGER', "id", 'MANAGER', 'Manager', ARRAY[
  'users:read','departments:read','locations:read','shifts:read',
  'shifts:write','timeOff:read','timeOff:write'
]::TEXT[] FROM "Organization";

INSERT INTO "OrganizationRole" ("id", "organizationId", "key", "name", "permissions")
SELECT "id" || ':OPERATOR', "id", 'OPERATOR', 'Operator', ARRAY[
  'users:read','departments:read','locations:read','shifts:read',
  'timeOff:read','timeOff:write'
]::TEXT[] FROM "Organization";

INSERT INTO "OrganizationRole" ("id", "organizationId", "key", "name", "permissions")
SELECT "id" || ':VIEWER', "id", 'VIEWER', 'Viewer', ARRAY[
  'users:read','departments:read','locations:read','shifts:read','timeOff:read'
]::TEXT[] FROM "Organization";

-- Preserve equivalent access: legacy ADMIN becomes organization Admin and
-- legacy USER becomes Operator, whose grant set matches the previous USER role.
INSERT INTO "RoleAssignment" ("id", "membershipId", "roleId")
SELECT md5('role:' || m."id"), m."id",
  m."organizationId" || CASE WHEN u."role" = 'ADMIN' THEN ':ADMIN' ELSE ':OPERATOR' END
FROM "Membership" m
JOIN "User" u ON u."id" = m."userId";
