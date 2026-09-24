"use server"

import { prisma } from "@/lib/db"
import {
  createDepartmentSchema,
  updateDepartmentSchema,
} from "@/lib/schemas/department"
import type { ActionResult } from "@/features/errors/dto"
import { AppError, withErrorBoundary } from "@/features/errors/server"
import { Actions } from "@/features/auth/permissions"
import { authorize } from "@/features/auth/session"
import type { Department } from "@/features/departments/types/department-types"

function toPublicDepartment(row: {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}): Department {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function listDepartments(): Promise<ActionResult<Department[]>> {
  return withErrorBoundary(async () => {
    const session = await authorize(Actions.departments.read)
    const rows = await prisma.department.findMany({
      where: { organizationId: session.activeOrganizationId, deletedAt: null },
      orderBy: { name: "asc" },
    })
    return rows.map(toPublicDepartment)
  })
}

export async function createDepartment(
  input: unknown,
): Promise<ActionResult<Department>> {
  return withErrorBoundary(async () => {
    const session = await authorize(Actions.departments.write)
    const parsed = createDepartmentSchema.parse(input)

    const row = await prisma.department.create({
      data: {
        organizationId: session.activeOrganizationId,
        name: parsed.name,
        description: parsed.description || null,
        isActive: parsed.isActive ?? true,
      },
    })

    return toPublicDepartment(row)
  })
}

export async function updateDepartment(
  input: unknown,
): Promise<ActionResult<Department>> {
  return withErrorBoundary(async () => {
    const session = await authorize(Actions.departments.write)
    const parsed = updateDepartmentSchema.parse(input)

    const existing = await prisma.department.findFirst({
      where: { id: parsed.id, organizationId: session.activeOrganizationId, deletedAt: null },
    })
    if (!existing) {
      throw new AppError({
        kind: "not_found",
        code: "DEPARTMENT_NOT_FOUND",
        message: "That department could not be found.",
      })
    }

    const row = await prisma.department.update({
      where: { id: parsed.id },
      data: {
        name: parsed.name,
        description: parsed.description || null,
        isActive: parsed.isActive ?? existing.isActive,
      },
    })

    return toPublicDepartment(row)
  })
}

export async function deleteDepartment(
  id: string,
): Promise<ActionResult<true>> {
  return withErrorBoundary(async () => {
    const session = await authorize(Actions.departments.write)
    const existing = await prisma.department.findFirst({
      where: { id, organizationId: session.activeOrganizationId, deletedAt: null },
    })
    if (!existing) {
      throw new AppError({
        kind: "not_found",
        code: "DEPARTMENT_NOT_FOUND",
        message: "That department could not be found.",
      })
    }

    await prisma.department.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    })

    return true as const
  })
}
