import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

import {
  createTestPrismaClient,
  createTestUser,
  resetTestDatabase,
} from "../support/test-database"

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
      data: { name: "Managed location", managerId: manager.id },
    })
    const otherLocation = await prisma.location.create({
      data: { name: "Unmanaged location" },
    })
    const session = {
      ...manager,
      userId: manager.id,
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
})
