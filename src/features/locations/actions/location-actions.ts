"use server"

import { prisma } from "@/lib/db"
import {
  createLocationSchema,
  updateLocationSchema,
} from "@/lib/schemas/location"
import type { ActionResult } from "@/features/errors/dto"
import { AppError, withErrorBoundary } from "@/features/errors/server"
import { Actions } from "@/features/auth/permissions"
import { authorize } from "@/features/auth/session"
import type { Location } from "@/features/locations/types/location-types"

type LocationRow = {
  id: string
  name: string
  description: string | null
  managerId: string | null
  minimumStaff: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  manager?: { fullName: string } | null
  _count?: { users: number }
}

function toPublicLocation(row: LocationRow): Location {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    managerId: row.managerId,
    managerName: row.manager?.fullName ?? null,
    minimumStaff: row.minimumStaff,
    staffCount: row._count?.users ?? 0,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

async function assertManagerExists(managerId: string | null): Promise<void> {
  if (!managerId) return
  const manager = await prisma.user.findFirst({
    where: { id: managerId, deletedAt: null },
    select: { id: true },
  })
  if (!manager) {
    throw new AppError({
      kind: "not_found",
      code: "USER_NOT_FOUND",
      message: "That manager could not be found.",
    })
  }
}

const locationInclude = {
  manager: { select: { fullName: true } },
  _count: {
    select: {
      users: { where: { deletedAt: null } },
    },
  },
} as const

export type ManagedLocationOption = {
  id: string
  name: string
}

/** Locations the current user manages (all locations for ADMIN). */
export async function listManagedLocations(): Promise<
  ActionResult<ManagedLocationOption[]>
> {
  return withErrorBoundary(async () => {
    const session = await authorize(Actions.locations.read)

    if (session.role === "ADMIN") {
      const rows = await prisma.location.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
      return rows
    }

    const rows = await prisma.location.findMany({
      where: { deletedAt: null, managerId: session.userId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })
    return rows
  })
}

export async function listLocations(): Promise<ActionResult<Location[]>> {
  return withErrorBoundary(async () => {
    await authorize(Actions.locations.read)
    const rows = await prisma.location.findMany({
      where: { deletedAt: null },
      include: locationInclude,
      orderBy: { name: "asc" },
    })
    return rows.map(toPublicLocation)
  })
}

export async function createLocation(
  input: unknown,
): Promise<ActionResult<Location>> {
  return withErrorBoundary(async () => {
    await authorize(Actions.locations.write)
    const parsed = createLocationSchema.parse(input)
    const managerId = parsed.managerId || null
    await assertManagerExists(managerId)

    const row = await prisma.location.create({
      data: {
        name: parsed.name,
        description: parsed.description || null,
        managerId,
        minimumStaff: parsed.minimumStaff ?? 0,
        isActive: parsed.isActive ?? true,
      },
      include: locationInclude,
    })

    return toPublicLocation(row)
  })
}

export async function updateLocation(
  input: unknown,
): Promise<ActionResult<Location>> {
  return withErrorBoundary(async () => {
    await authorize(Actions.locations.write)
    const parsed = updateLocationSchema.parse(input)

    const existing = await prisma.location.findFirst({
      where: { id: parsed.id, deletedAt: null },
    })
    if (!existing) {
      throw new AppError({
        kind: "not_found",
        code: "LOCATION_NOT_FOUND",
        message: "That location could not be found.",
      })
    }

    const managerId = parsed.managerId || null
    await assertManagerExists(managerId)

    const row = await prisma.location.update({
      where: { id: parsed.id },
      data: {
        name: parsed.name,
        description: parsed.description || null,
        managerId,
        minimumStaff: parsed.minimumStaff ?? existing.minimumStaff,
        isActive: parsed.isActive ?? existing.isActive,
      },
      include: locationInclude,
    })

    return toPublicLocation(row)
  })
}

export async function deleteLocation(id: string): Promise<ActionResult<true>> {
  return withErrorBoundary(async () => {
    await authorize(Actions.locations.write)
    const existing = await prisma.location.findFirst({
      where: { id, deletedAt: null },
    })
    if (!existing) {
      throw new AppError({
        kind: "not_found",
        code: "LOCATION_NOT_FOUND",
        message: "That location could not be found.",
      })
    }

    await prisma.location.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    })

    return true as const
  })
}
