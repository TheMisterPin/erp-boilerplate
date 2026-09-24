import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { bootstrapOrganization } from "@/features/organizations/bootstrap"
import {
  createTestPrismaClient,
  createTestUser,
  resetTestDatabase,
} from "../support/test-database"

const prisma = createTestPrismaClient()

beforeEach(async () => resetTestDatabase(prisma))
afterAll(async () => prisma.$disconnect())

describe("organization bootstrap", () => {
  it("atomically creates the role catalog and first administrator", async () => {
    const user = await createTestUser(prisma)

    const result = await bootstrapOrganization(prisma, {
      name: "Bootstrapped Organization",
      slug: "bootstrapped-organization",
      administratorUserId: user.id,
    })

    const assignment = await prisma.roleAssignment.findUnique({
      where: { membershipId: result.membership.id },
      include: { role: true },
    })
    expect(await prisma.organizationRole.count({
      where: { organizationId: result.organization.id },
    })).toBe(4)
    expect(assignment?.role.key).toBe("ADMIN")
  })
})
