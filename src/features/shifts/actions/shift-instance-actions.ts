"use server"

import { Actions } from "@/features/auth/permissions"
import { authorize, requireSession } from "@/features/auth/session"
import type { ActionResult } from "@/features/errors/dto"
import { AppError, withErrorBoundary } from "@/features/errors/server"
import { logActivity } from "@/features/logging/server"
import {
  assertCanWriteShiftsAtLocation,
  formatDateOnly,
  listManagedLocationIds,
  parseDateOnly,
} from "@/features/shifts/actions/shift-access"
import type { ShiftInstance } from "@/features/shifts/types/shift-types"
import { prisma } from "@/lib/db"
import {
  createShiftInstanceSchema,
  updateShiftInstanceSchema,
} from "@/lib/schemas/shift"

type InstanceRow = {
  id: string
  templateId: string | null
  locationId: string
  userId: string
  date: Date
  type: ShiftInstance["type"]
  startTime: string
  endTime: string
  status: ShiftInstance["status"]
  notes: string | null
  createdAt: Date
  updatedAt: Date
  location?: { name: string } | null
  user?: { fullName: string } | null
}

const instanceInclude = {
  location: { select: { name: true } },
  user: { select: { fullName: true } },
} as const

function toPublicInstance(row: InstanceRow): ShiftInstance {
  return {
    id: row.id,
    templateId: row.templateId,
    locationId: row.locationId,
    locationName: row.location?.name ?? null,
    userId: row.userId,
    userName: row.user?.fullName ?? null,
    date: formatDateOnly(row.date),
    type: row.type,
    startTime: row.startTime,
    endTime: row.endTime,
    status: row.status,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

async function assertUserExists(userId: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true },
  })
  if (!user) {
    throw new AppError({
      kind: "not_found",
      code: "USER_NOT_FOUND",
      message: "That user could not be found.",
    })
  }
}

async function assertLocationExists(locationId: string): Promise<void> {
  const location = await prisma.location.findFirst({
    where: { id: locationId, deletedAt: null },
    select: { id: true },
  })
  if (!location) {
    throw new AppError({
      kind: "not_found",
      code: "LOCATION_NOT_FOUND",
      message: "That location could not be found.",
    })
  }
}

export async function listShiftInstances(): Promise<
  ActionResult<ShiftInstance[]>
> {
  return withErrorBoundary(async () => {
    const session = await authorize(Actions.shifts.read)
    const managedIds = await listManagedLocationIds(session)

    let where: {
      deletedAt: null
      userId?: string
      locationId?: { in: string[] }
    } = { deletedAt: null }

    if (session.role === "ADMIN") {
      where = { deletedAt: null }
    } else if (managedIds.length > 0) {
      where = { deletedAt: null, locationId: { in: managedIds } }
    } else {
      where = { deletedAt: null, userId: session.userId }
    }

    const rows = await prisma.shiftInstance.findMany({
      where,
      include: instanceInclude,
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    })
    return rows.map(toPublicInstance)
  })
}

export async function createShiftInstance(
  input: unknown,
): Promise<ActionResult<ShiftInstance>> {
  return withErrorBoundary(async () => {
    const session = await requireSession()
    const parsed = createShiftInstanceSchema.parse(input)
    await assertCanWriteShiftsAtLocation(session, parsed.locationId)
    await assertLocationExists(parsed.locationId)
    await assertUserExists(parsed.userId)

    const date = parseDateOnly(parsed.date)
    const duplicate = await prisma.shiftInstance.findFirst({
      where: {
        deletedAt: null,
        userId: parsed.userId,
        date,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
      },
      select: { id: true },
    })
    if (duplicate) {
      throw new AppError({
        kind: "conflict",
        code: "SHIFT_OVERLAP",
        message: "That user already has a shift at this time on that date.",
      })
    }

    const row = await prisma.shiftInstance.create({
      data: {
        templateId: parsed.templateId || null,
        locationId: parsed.locationId,
        userId: parsed.userId,
        date,
        type: parsed.type,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        status: parsed.status ?? "SCHEDULED",
        notes: parsed.notes || null,
      },
      include: instanceInclude,
    })

    await logActivity({
      userId: session.userId,
      activity: "SHIFT_INSTANCE_CREATE",
      activityData: { instanceId: row.id },
    })

    return toPublicInstance(row)
  })
}

export async function updateShiftInstance(
  input: unknown,
): Promise<ActionResult<ShiftInstance>> {
  return withErrorBoundary(async () => {
    const session = await requireSession()
    const parsed = updateShiftInstanceSchema.parse(input)

    const existing = await prisma.shiftInstance.findFirst({
      where: { id: parsed.id, deletedAt: null },
    })
    if (!existing) {
      throw new AppError({
        kind: "not_found",
        code: "SHIFT_INSTANCE_NOT_FOUND",
        message: "That shift could not be found.",
      })
    }

    await assertCanWriteShiftsAtLocation(session, existing.locationId)
    await assertCanWriteShiftsAtLocation(session, parsed.locationId)
    await assertLocationExists(parsed.locationId)
    await assertUserExists(parsed.userId)

    const date = parseDateOnly(parsed.date)
    const duplicate = await prisma.shiftInstance.findFirst({
      where: {
        deletedAt: null,
        id: { not: parsed.id },
        userId: parsed.userId,
        date,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
      },
      select: { id: true },
    })
    if (duplicate) {
      throw new AppError({
        kind: "conflict",
        code: "SHIFT_OVERLAP",
        message: "That user already has a shift at this time on that date.",
      })
    }

    const row = await prisma.shiftInstance.update({
      where: { id: parsed.id },
      data: {
        templateId: parsed.templateId || null,
        locationId: parsed.locationId,
        userId: parsed.userId,
        date,
        type: parsed.type,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        status: parsed.status ?? existing.status,
        notes: parsed.notes || null,
      },
      include: instanceInclude,
    })

    await logActivity({
      userId: session.userId,
      activity: "SHIFT_INSTANCE_UPDATE",
      activityData: { instanceId: row.id },
    })

    return toPublicInstance(row)
  })
}

export async function deleteShiftInstance(
  id: string,
): Promise<ActionResult<true>> {
  return withErrorBoundary(async () => {
    const session = await requireSession()
    const existing = await prisma.shiftInstance.findFirst({
      where: { id, deletedAt: null },
    })
    if (!existing) {
      throw new AppError({
        kind: "not_found",
        code: "SHIFT_INSTANCE_NOT_FOUND",
        message: "That shift could not be found.",
      })
    }

    await assertCanWriteShiftsAtLocation(session, existing.locationId)

    await prisma.shiftInstance.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    await logActivity({
      userId: session.userId,
      activity: "SHIFT_INSTANCE_DELETE",
      activityData: { instanceId: id },
    })

    return true as const
  })
}
