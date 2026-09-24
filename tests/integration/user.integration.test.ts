import { afterAll, beforeEach, describe, expect, it } from "vitest"

import {
  createTestPrismaClient,
  createTestUser,
  resetTestDatabase,
} from "../support/test-database"

const prisma = createTestPrismaClient()

describe("Prisma integration-test foundation", () => {
  beforeEach(async () => {
    await resetTestDatabase(prisma)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("creates deterministic isolated records", async () => {
    const created = await createTestUser(prisma, {
      email: "integration-user@example.test",
      firstName: "Integration",
      lastName: "User",
      role: "ADMIN",
    })

    const persisted = await prisma.user.findUnique({
      where: { email: "integration-user@example.test" },
    })

    expect(persisted).toMatchObject({
      id: created.id,
      fullName: "Integration User",
      role: "ADMIN",
    })
    expect(await prisma.user.count()).toBe(1)
  })
})
