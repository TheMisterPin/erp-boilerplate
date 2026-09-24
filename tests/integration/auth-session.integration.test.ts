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
}))

vi.mock("@/features/auth/utils", () => ({ getSession: mocks.getSession }))
vi.mock("@/lib/db", () => ({
  prisma: { user: { findUnique: mocks.findUser } },
}))

import { authorize, requireSession } from "@/features/auth/session"

const prisma = createTestPrismaClient()

function sessionFor(userId: string) {
  return {
    userId,
    email: "stale@example.test",
    role: "ADMIN" as const,
    fullName: "Stale Identity",
    expires: "2030-01-01T00:00:00.000Z",
    absoluteExpires: "2030-02-01T00:00:00.000Z",
  }
}

beforeEach(async () => {
  await resetTestDatabase(prisma)
  mocks.getSession.mockReset()
  mocks.findUser.mockReset()
  mocks.findUser.mockImplementation((args) => prisma.user.findUnique(args))
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe("database-backed sessions", () => {
  it("uses the current database identity and role", async () => {
    const user = await createTestUser(prisma, { role: "USER" })
    mocks.getSession.mockResolvedValue(sessionFor(user.id))

    await expect(requireSession()).resolves.toMatchObject({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: "USER",
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
    mocks.getSession.mockResolvedValue(sessionFor(change ? user.id : "missing"))

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

  it.each(["ADMIN", "USER"] as const)(
    "matches every action for %s",
    async (role) => {
      const user = await createTestUser(prisma, { role })
      mocks.getSession.mockResolvedValue(sessionFor(user.id))

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
