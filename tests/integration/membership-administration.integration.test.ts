import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

import {
  createTestPrismaClient,
  createTestUser,
  resetTestDatabase,
} from "../support/test-database"

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  requireSession: vi.fn(),
  createSession: vi.fn(),
  transaction: vi.fn(),
  findMemberships: vi.fn(),
  findMembership: vi.fn(),
  findUser: vi.fn(),
  findRole: vi.fn(),
  logActivity: vi.fn(),
}))

vi.mock("@/features/auth/session", () => ({
  authorize: mocks.authorize,
  requireSession: mocks.requireSession,
}))
vi.mock("@/features/auth/utils", () => ({
  createSession: mocks.createSession,
}))
vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: mocks.transaction,
    membership: {
      findMany: mocks.findMemberships,
      findFirst: mocks.findMembership,
    },
    user: { findFirst: mocks.findUser },
    organizationRole: { findFirst: mocks.findRole },
  },
}))
vi.mock("@/features/logging/server", () => ({ logActivity: mocks.logActivity }))

import {
  addMembership,
  changeMembershipRole,
  changeMembershipStatus,
  removeMembership,
} from "@/features/organizations/actions/membership-actions"
import { switchOrganization } from "@/features/organizations/actions/organization-actions"

const prisma = createTestPrismaClient()

function sessionFor(user: {
  id: string
  email: string
  fullName: string
  role: "ADMIN" | "USER"
  activeOrganizationId: string
}) {
  return {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    systemRole: user.role,
    sessionVersion: 0,
    activeOrganizationId: user.activeOrganizationId,
    role: "ADMIN" as const,
    permissions: ["memberships:read", "memberships:write"] as const,
    organization: {
      id: user.activeOrganizationId,
      name: "Test Organization",
      slug: "test-organization",
    },
    expires: "2030-01-01T00:00:00.000Z",
    absoluteExpires: "2030-02-01T00:00:00.000Z",
  }
}

async function createRole(
  organizationId: string,
  key: "ADMIN" | "MANAGER" | "OPERATOR" | "VIEWER",
) {
  return prisma.organizationRole.upsert({
    where: { organizationId_key: { organizationId, key } },
    update: {},
    create: { organizationId, key, name: key, permissions: [] },
  })
}

beforeEach(async () => {
  await resetTestDatabase(prisma)
  vi.clearAllMocks()
  mocks.transaction.mockImplementation((operation, options) =>
    prisma.$transaction(operation, options),
  )
  mocks.findMemberships.mockImplementation((args) => prisma.membership.findMany(args))
  mocks.findMembership.mockImplementation((args) => prisma.membership.findFirst(args))
  mocks.findUser.mockImplementation((args) => prisma.user.findFirst(args))
  mocks.findRole.mockImplementation((args) => prisma.organizationRole.findFirst(args))
  mocks.logActivity.mockImplementation(async (input, tx) => {
    const row = await (tx ?? prisma).userActivity.create({
      data: {
        userId: input.userId,
        organizationId: input.organizationId,
        activity: input.activity,
        activityData: input.activityData,
      },
      select: { id: true },
    })
    return row.id
  })
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe("organization membership administration", () => {
  it("adds an existing account with an organization role and writes an audit event", async () => {
    const administrator = await createTestUser(prisma, { role: "ADMIN" })
    const operator = await createRole(
      administrator.activeOrganizationId,
      "OPERATOR",
    )
    const target = await prisma.user.create({
      data: {
        email: "target@example.test",
        firstName: "Target",
        lastName: "User",
        fullName: "Target User",
        password: "not-a-real-password",
      },
    })
    const session = sessionFor(administrator)
    mocks.authorize.mockResolvedValue(session)

    const result = await addMembership({
      email: target.email.toUpperCase(),
      roleId: operator.id,
    })

    expect(result).toMatchObject({
      ok: true,
      data: { userId: target.id, roleKey: "OPERATOR", status: "ACTIVE" },
    })
    await expect(
      prisma.userActivity.findFirst({
        where: {
          organizationId: administrator.activeOrganizationId,
          activity: "MEMBERSHIP_ADD",
        },
      }),
    ).resolves.toBeTruthy()
  })

  it("protects the final active administrator from demotion, deactivation, and removal", async () => {
    const administrator = await createTestUser(prisma, { role: "ADMIN" })
    const operator = await createRole(
      administrator.activeOrganizationId,
      "OPERATOR",
    )
    const membership = await prisma.membership.findUniqueOrThrow({
      where: {
        organizationId_userId: {
          organizationId: administrator.activeOrganizationId,
          userId: administrator.id,
        },
      },
    })
    mocks.authorize.mockResolvedValue(sessionFor(administrator))

    await expect(
      changeMembershipRole({ membershipId: membership.id, roleId: operator.id }),
    ).resolves.toMatchObject({ ok: false, error: { code: "LAST_ACTIVE_ADMIN" } })
    await expect(
      changeMembershipStatus({ membershipId: membership.id, status: "INACTIVE" }),
    ).resolves.toMatchObject({ ok: false, error: { code: "LAST_ACTIVE_ADMIN" } })
    await expect(removeMembership({ membershipId: membership.id })).resolves.toMatchObject({
      ok: false,
      error: { code: "LAST_ACTIVE_ADMIN" },
    })
  })

  it("switches only to an active membership and records the selected organization", async () => {
    const administrator = await createTestUser(prisma, { role: "ADMIN" })
    const otherOrganization = await prisma.organization.create({
      data: { name: "Other Organization", slug: "other-organization" },
    })
    const viewer = await createRole(otherOrganization.id, "VIEWER")
    await prisma.membership.create({
      data: {
        organizationId: otherOrganization.id,
        userId: administrator.id,
        roleAssignment: { create: { roleId: viewer.id } },
      },
    })
    mocks.requireSession.mockResolvedValue(sessionFor(administrator))

    await expect(switchOrganization(otherOrganization.id)).resolves.toMatchObject({
      ok: true,
      data: { id: otherOrganization.id, role: "VIEWER", isCurrent: true },
    })
    expect(mocks.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ activeOrganizationId: otherOrganization.id }),
    )

    await prisma.membership.update({
      where: {
        organizationId_userId: {
          organizationId: otherOrganization.id,
          userId: administrator.id,
        },
      },
      data: { status: "INACTIVE" },
    })

    await expect(switchOrganization(otherOrganization.id)).resolves.toMatchObject({
      ok: false,
      error: { code: "ORGANIZATION_NOT_FOUND" },
    })
  })
})
