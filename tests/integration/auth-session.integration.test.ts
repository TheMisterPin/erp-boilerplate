import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Actions, can } from "@/features/auth/permissions"
import {
  createTestPrismaClient,
  createTestUser,
  resetTestDatabase,
} from "../support/test-database"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  findUser: vi.fn(),
  findMembership: vi.fn(),
}))

vi.mock("@/features/auth/utils", () => ({ getSession: mocks.getSession }))
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: mocks.findUser },
    membership: { findFirst: mocks.findMembership },
  },
}))

import { authorize, requireSession } from "@/features/auth/session"

const prisma = createTestPrismaClient()

function sessionFor(userId: string, activeOrganizationId: string) {
  return {
    userId,
    activeOrganizationId,
    email: "stale@example.test",
    systemRole: "ADMIN" as const,
    fullName: "Stale Identity",
    sessionVersion: 0,
    expires: "2030-01-01T00:00:00.000Z",
    absoluteExpires: "2030-02-01T00:00:00.000Z",
  }
}

beforeEach(async () => {
  await resetTestDatabase(prisma)
  mocks.getSession.mockReset()
  mocks.findUser.mockReset()
  mocks.findMembership.mockReset()
  mocks.findUser.mockImplementation((args) => prisma.user.findUnique(args))
  mocks.findMembership.mockImplementation((args) =>
    prisma.membership.findFirst(args),
  )
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe("database-backed sessions", () => {
  it("uses the current database identity and role", async () => {
    const user = await createTestUser(prisma, { role: "OPERATOR" })
    mocks.getSession.mockResolvedValue(
      sessionFor(user.id, user.activeOrganizationId),
    )

    await expect(requireSession()).resolves.toMatchObject({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: "OPERATOR",
    })
  })

  it.each([
    ["missing", null],
    ["inactive", { isActive: false }],
    ["soft-deleted", { deletedAt: new Date() }],
  ])("rejects a %s account", async (_state, change) => {
    const user = await createTestUser(prisma)
    if (change) {
      await prisma.user.update({ where: { id: user.id }, data: change })
    }
    mocks.getSession.mockResolvedValue(
      sessionFor(
        change ? user.id : "missing",
        user.activeOrganizationId,
      ),
    )

    await expect(requireSession()).rejects.toMatchObject({
      dto: { code: "SESSION_EXPIRED", kind: "auth" },
    })
  })

  it("rejects an absent session", async () => {
    mocks.getSession.mockReset()
    mocks.getSession.mockReset()
    mocks.getSession.mockResolvedValue(null)

    await expect(requireSession()).rejects.toMatchObject({
      dto: { code: "SESSION_EXPIRED", kind: "auth" },
    })
  })

  it("rejects an inactive membership for the selected organization", async () => {
    const user = await createTestUser(prisma)
    await prisma.membership.update({
      where: {
        organizationId_userId: {
          organizationId: user.activeOrganizationId,
          userId: user.id,
        },
      },
      data: { status: "INACTIVE" },
    })
    mocks.getSession.mockResolvedValue(
      sessionFor(user.id, user.activeOrganizationId),
    )

    await expect(requireSession()).rejects.toMatchObject({
      dto: { code: "ORGANIZATION_ACCESS_REVOKED", kind: "auth" },
    })
  })

  it("rejects an inactive selected organization", async () => {
    const user = await createTestUser(prisma)
    await prisma.organization.update({
      where: { id: user.activeOrganizationId },
      data: { status: "INACTIVE" },
    })
    mocks.getSession.mockResolvedValue(
      sessionFor(user.id, user.activeOrganizationId),
    )

    await expect(requireSession()).rejects.toMatchObject({
      dto: { code: "ORGANIZATION_ACCESS_REVOKED", kind: "auth" },
    })
  })

  it("resolves different roles for the same user in two organizations", async () => {
    const user = await createTestUser(prisma, { role: "ADMIN" })
    const secondOrganization = await prisma.organization.create({
      data: { name: "Second Organization", slug: "second-organization" },
    })
    const viewer = await prisma.organizationRole.create({
      data: {
        organizationId: secondOrganization.id,
        key: "VIEWER",
        name: "Viewer",
        permissions: ["users:read", "shifts:read"],
      },
    })
    await prisma.membership.create({
      data: {
        organizationId: secondOrganization.id,
        userId: user.id,
        roleAssignment: { create: { roleId: viewer.id } },
      },
    })
    mocks.getSession.mockResolvedValue(
      sessionFor(user.id, secondOrganization.id),
    )

    await expect(requireSession()).resolves.toMatchObject({
      role: "VIEWER",
      permissions: ["users:read", "shifts:read"],
      organization: { id: secondOrganization.id },
    })
  })

  it("grants nothing for a deleted role assignment", async () => {
    const user = await createTestUser(prisma, { role: "ADMIN" })
    const membership = await prisma.membership.findUniqueOrThrow({
      where: {
        organizationId_userId: {
          organizationId: user.activeOrganizationId,
          userId: user.id,
        },
      },
    })
    await prisma.roleAssignment.update({
      where: { membershipId: membership.id },
      data: { deletedAt: new Date() },
    })
    mocks.getSession.mockResolvedValue(
      sessionFor(user.id, user.activeOrganizationId),
    )

    await expect(requireSession()).rejects.toMatchObject({
      dto: { code: "ORGANIZATION_ACCESS_REVOKED", kind: "auth" },
    })
  })
})

describe("permission matrix", () => {
  const actions = [
    Actions.users.read,
    Actions.users.write,
    Actions.departments.read,
    Actions.departments.write,
    Actions.locations.read,
    Actions.locations.write,
    Actions.shifts.read,
    Actions.shifts.write,
    Actions.logging.read,
    Actions.timeOff.read,
    Actions.timeOff.write,
  ]

  it.each(["ADMIN", "OPERATOR"] as const)(
    "matches every action for %s",
    async (role) => {
      const user = await createTestUser(prisma, { role })
      mocks.getSession.mockResolvedValue(
        sessionFor(user.id, user.activeOrganizationId),
      )

      for (const action of actions) {
        if (can(role, action)) {
          await expect(authorize(action)).resolves.toMatchObject({ role })
        } else {
          await expect(authorize(action)).rejects.toMatchObject({
            dto: { code: "FORBIDDEN", kind: "permission" },
          })
        }
      }
    },
  )
})
