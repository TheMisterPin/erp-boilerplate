import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

import {
  createTestPrismaClient,
  createTestUser,
  resetTestDatabase,
} from "../support/test-database"
import type { AppSession } from "@/features/auth/session"

const mocks = vi.hoisted(() => ({ findLocation: vi.fn() }))

vi.mock("@/lib/db", () => ({
  prisma: { location: { findFirst: mocks.findLocation } },
}))

import { assertCanWriteShiftsAtLocation } from "@/features/shifts/actions/shift-access"

const prisma = createTestPrismaClient()

beforeEach(async () => {
  await resetTestDatabase(prisma)
  mocks.findLocation.mockReset()
  mocks.findLocation.mockImplementation((args) =>
    prisma.location.findFirst(args),
  )
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe("location-manager shift access", () => {
  it("allows a manager only at their managed location", async () => {
    const manager = await createTestUser(prisma)
    const ownLocation = await prisma.location.create({
      data: {
        name: "Managed location",
        managerId: manager.id,
        organizationId: manager.activeOrganizationId,
      },
    })
    const otherLocation = await prisma.location.create({
      data: {
        name: "Unmanaged location",
        organizationId: manager.activeOrganizationId,
      },
    })
    const session: AppSession = {
      ...manager,
      userId: manager.id,
      systemRole: manager.role,
      role: manager.organizationRole,
      permissions: ["shifts:read", "timeOff:read", "timeOff:write"],
      activeOrganizationId: manager.activeOrganizationId,
      organization: {
        id: manager.activeOrganizationId,
        name: "Test Organization",
        slug: "test-organization",
      },
      expires: "2030-01-01T00:00:00.000Z",
      absoluteExpires: "2030-02-01T00:00:00.000Z",
    }

    await expect(
      assertCanWriteShiftsAtLocation(session, ownLocation.id),
    ).resolves.toBeUndefined()
    await expect(
      assertCanWriteShiftsAtLocation(session, otherLocation.id),
    ).rejects.toMatchObject({ dto: { code: "FORBIDDEN" } })
  })

  it("rejects a location owned by another organization, including for admins", async () => {
    const admin = await createTestUser(prisma, { role: "ADMIN" })
    const otherOrganizationUser = await createTestUser(prisma)
    const foreignLocation = await prisma.location.create({
      data: {
        name: "Foreign location",
        organizationId: otherOrganizationUser.activeOrganizationId,
      },
    })
    const session: AppSession = {
      ...admin,
      userId: admin.id,
      systemRole: admin.role,
      role: admin.organizationRole,
      permissions: ["shifts:read", "shifts:write"],
      activeOrganizationId: admin.activeOrganizationId,
      organization: {
        id: admin.activeOrganizationId,
        name: "Test Organization",
        slug: "test-organization",
      },
      expires: "2030-01-01T00:00:00.000Z",
      absoluteExpires: "2030-02-01T00:00:00.000Z",
    }

    await expect(
      assertCanWriteShiftsAtLocation(session, foreignLocation.id),
    ).rejects.toMatchObject({ dto: { code: "FORBIDDEN" } })
  })
})
