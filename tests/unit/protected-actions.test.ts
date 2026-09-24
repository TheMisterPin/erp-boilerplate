import { describe, expect, it, vi } from "vitest"

import { AppError } from "@/features/errors/server"

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  createDepartment: vi.fn(),
  listActivities: vi.fn(),
}))

vi.mock("@/features/auth/session", () => ({
  authorize: mocks.authorize,
}))
vi.mock("@/lib/db", () => ({
  prisma: {
    department: { create: mocks.createDepartment },
    userActivity: { findMany: mocks.listActivities },
  },
}))

import { createDepartment } from "@/features/departments/actions/department-actions"
import { listActivities } from "@/features/logging/actions/activity-actions"

const forbidden = new AppError({
  kind: "permission",
  code: "FORBIDDEN",
  message: "You do not have permission to perform this action.",
})

describe("protected server actions", () => {
  it("returns a stable forbidden response for a direct write call", async () => {
    mocks.authorize.mockRejectedValueOnce(forbidden)

    await expect(createDepartment({ name: "Direct call" })).resolves.toEqual({
      ok: false,
      error: forbidden.dto,
    })
    expect(mocks.createDepartment).not.toHaveBeenCalled()
  })

  it("returns a stable forbidden response for a direct audit-read call", async () => {
    mocks.authorize.mockRejectedValueOnce(forbidden)

    await expect(listActivities()).resolves.toEqual({
      ok: false,
      error: forbidden.dto,
    })
    expect(mocks.listActivities).not.toHaveBeenCalled()
  })
})
