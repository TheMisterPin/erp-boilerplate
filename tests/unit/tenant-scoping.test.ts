import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  findDepartments: vi.fn(),
  findDepartment: vi.fn(),
  updateDepartment: vi.fn(),
}))

vi.mock("@/features/auth/session", () => ({
  authorize: mocks.authorize,
}))
vi.mock("@/lib/db", () => ({
  prisma: {
    department: {
      findMany: mocks.findDepartments,
      findFirst: mocks.findDepartment,
      update: mocks.updateDepartment,
    },
  },
}))

import {
  listDepartments,
  updateDepartment,
} from "@/features/departments/actions/department-actions"

describe("organization tenant scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.authorize.mockResolvedValue({
      userId: "user-1",
      activeOrganizationId: "organization-1",
      role: "ADMIN",
    })
  })

  it("always scopes business-record lists to the active organization", async () => {
    mocks.findDepartments.mockResolvedValue([])

    await expect(listDepartments()).resolves.toEqual({ ok: true, data: [] })
    expect(mocks.findDepartments).toHaveBeenCalledWith({
      where: { organizationId: "organization-1", deletedAt: null },
      orderBy: { name: "asc" },
    })
  })

  it("treats an identifier from another organization as not found", async () => {
    mocks.findDepartment.mockResolvedValue(null)
    const foreignDepartmentId = "00000000-0000-4000-8000-000000000002"

    const result = await updateDepartment({
      id: foreignDepartmentId,
      name: "Finance",
    })

    expect(mocks.findDepartment).toHaveBeenCalledWith({
      where: {
        id: foreignDepartmentId,
        organizationId: "organization-1",
        deletedAt: null,
      },
    })
    expect(result).toMatchObject({
      ok: false,
      error: { code: "DEPARTMENT_NOT_FOUND" },
    })
    expect(mocks.updateDepartment).not.toHaveBeenCalled()
  })
})
