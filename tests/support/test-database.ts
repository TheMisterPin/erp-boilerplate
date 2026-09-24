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
    await tx.userActivity.deleteMany()
    await tx.timeOffRequest.deleteMany()
    await tx.shiftInstance.deleteMany()
    await tx.shiftTemplate.deleteMany()
    await tx.location.updateMany({ data: { managerId: null } })
    await tx.user.deleteMany()
    await tx.location.deleteMany()
    await tx.department.deleteMany()
  })
  factorySequence = 0
}

export async function createTestUser(
  prisma: PrismaClient,
  input: Partial<{
    email: string
    firstName: string
    lastName: string
    role: "ADMIN" | "USER"
  }> = {},
) {
  factorySequence += 1
  const firstName = input.firstName ?? "Test"
  const lastName = input.lastName ?? `User ${factorySequence}`

  return prisma.user.create({
    data: {
      email: input.email ?? `test-user-${factorySequence}@example.test`,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      password: "not-a-real-password",
      role: input.role ?? "USER",
    },
  })
}
