import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "@/generated/prisma/client"

let factorySequence = 0

export function getTestDatabaseUrl(): string {
  const connectionString = process.env.DATABASE_URL_TEST
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL_TEST is required for integration tests; DATABASE_URL is never used.",
    )
  }

  const databaseName = new URL(connectionString).pathname.slice(1)
  if (!databaseName.endsWith("_test")) {
    throw new Error("DATABASE_URL_TEST must point to a database ending in _test.")
  }

  if (connectionString === process.env.DATABASE_URL && process.env.CI !== "true") {
    throw new Error(
      "DATABASE_URL_TEST must differ from DATABASE_URL outside CI to protect the development database.",
    )
  }

  return connectionString
}

export function createTestPrismaClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: getTestDatabaseUrl() }),
  })
}

export async function resetTestDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.shiftAttendance.deleteMany()
    await tx.membership.deleteMany()
    await tx.organizationRole.deleteMany()
    await tx.userActivity.deleteMany()
    await tx.timeOffRequest.deleteMany()
    await tx.shiftInstance.deleteMany()
    await tx.shiftTemplate.deleteMany()
    await tx.location.updateMany({ data: { managerId: null } })
    await tx.user.deleteMany()
    await tx.location.deleteMany()
    await tx.department.deleteMany()
    await tx.organization.deleteMany()
  })
  factorySequence = 0
}

export async function createTestUser(
  prisma: PrismaClient,
  input: Partial<{
    email: string
    firstName: string
    lastName: string
    role: "ADMIN" | "MANAGER" | "OPERATOR" | "VIEWER" | "USER"
  }> = {},
) {
  factorySequence += 1
  const firstName = input.firstName ?? "Test"
  const lastName = input.lastName ?? `User ${factorySequence}`

  const organization = await prisma.organization.create({
    data: {
      name: `Test Organization ${factorySequence}`,
      slug: `test-organization-${factorySequence}`,
    },
  })
  const organizationRole =
    input.role === "USER" ? "OPERATOR" : (input.role ?? "OPERATOR")
  const role = await prisma.organizationRole.create({
    data: {
      organizationId: organization.id,
      key: organizationRole,
      name: organizationRole,
      permissions:
        organizationRole === "ADMIN"
          ? [
              "users:read",
              "users:write",
              "departments:read",
              "departments:write",
              "locations:read",
              "locations:write",
              "shifts:read",
              "shifts:write",
              "logging:read",
              "timeOff:read",
              "timeOff:write",
              "memberships:read",
              "memberships:write",
            ]
          : [
              "users:read",
              "departments:read",
              "locations:read",
              "shifts:read",
              "timeOff:read",
              "timeOff:write",
            ],
    },
  })
  const user = await prisma.user.create({
    data: {
      email: input.email ?? `test-user-${factorySequence}@example.test`,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      password: "not-a-real-password",
      role: input.role === "ADMIN" ? "ADMIN" : "USER",
    },
  })
  await prisma.membership.create({
    data: {
      organizationId: organization.id,
      userId: user.id,
      roleAssignment: { create: { roleId: role.id } },
    },
  })

  return {
    ...user,
    activeOrganizationId: organization.id,
    organizationRole,
  }
}
