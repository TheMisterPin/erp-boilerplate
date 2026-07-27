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
  weekdaysFromForm,
} from "@/features/shifts/actions/shift-access"
import type {
  ManagedLocation,
  ShiftTemplate,
} from "@/features/shifts/types/shift-types"
import { prisma } from "@/lib/db"
import {
  createShiftTemplateSchema,
  generateShiftInstancesSchema,
  updateShiftTemplateSchema,
} from "@/lib/schemas/shift"

type TemplateRow = {
  id: string
  locationId: string
  userId: string
  type: ShiftTemplate["type"]
  startTime: string
  endTime: string
  weekdays: number[]
  notes: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  location?: { name: string } | null
  user?: { fullName: string } | null
}

const templateInclude = {
  location: { select: { name: true } },
  user: { select: { fullName: true } },
} as const

function toPublicTemplate(row: TemplateRow): ShiftTemplate {
  return {
    id: row.id,
    locationId: row.locationId,
    locationName: row.location?.name ?? null,
    userId: row.userId,
    userName: row.user?.fullName ?? null,
    type: row.type,
    startTime: row.startTime,
    endTime: row.endTime,
    weekdays: row.weekdays,
    notes: row.notes,
    isActive: row.isActive,
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

export async function listManagedLocations(): Promise<
  ActionResult<ManagedLocation[]>
> {
  return withErrorBoundary(async () => {
    const session = await requireSession()
    await authorize(Actions.shifts.read)

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

export async function listShiftTemplates(): Promise<
  ActionResult<ShiftTemplate[]>
> {
  return withErrorBoundary(async () => {
    const session = await authorize(Actions.shifts.read)
    const managedIds = await listManagedLocationIds(session)

    if (session.role !== "ADMIN" && managedIds.length === 0) {
      return []
    }

    const rows = await prisma.shiftTemplate.findMany({
      where:
        session.role === "ADMIN"
          ? { deletedAt: null }
          : { deletedAt: null, locationId: { in: managedIds } },
      include: templateInclude,
      orderBy: { createdAt: "desc" },
    })
    return rows.map(toPublicTemplate)
  })
}

export async function createShiftTemplate(
  input: unknown,
): Promise<ActionResult<ShiftTemplate>> {
  return withErrorBoundary(async () => {
    const session = await requireSession()
    const parsed = createShiftTemplateSchema.parse(input)
    await assertCanWriteShiftsAtLocation(session, parsed.locationId)
    await assertLocationExists(parsed.locationId)
    await assertUserExists(parsed.userId)

    const weekdays = weekdaysFromForm(parsed.weekdays)
    const row = await prisma.shiftTemplate.create({
      data: {
        locationId: parsed.locationId,
        userId: parsed.userId,
        type: parsed.type,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        weekdays,
        notes: parsed.notes || null,
        isActive: parsed.isActive ?? true,
      },
      include: templateInclude,
    })

    await logActivity({
      userId: session.userId,
      activity: "SHIFT_TEMPLATE_CREATE",
      activityData: { templateId: row.id },
    })

    return toPublicTemplate(row)
  })
}

export async function updateShiftTemplate(
  input: unknown,
): Promise<ActionResult<ShiftTemplate>> {
  return withErrorBoundary(async () => {
    const session = await requireSession()
    const parsed = updateShiftTemplateSchema.parse(input)

    const existing = await prisma.shiftTemplate.findFirst({
      where: { id: parsed.id, deletedAt: null },
    })
    if (!existing) {
      throw new AppError({
        kind: "not_found",
        code: "SHIFT_TEMPLATE_NOT_FOUND",
        message: "That shift template could not be found.",
      })
    }

    await assertCanWriteShiftsAtLocation(session, existing.locationId)
    await assertCanWriteShiftsAtLocation(session, parsed.locationId)
    await assertLocationExists(parsed.locationId)
    await assertUserExists(parsed.userId)

    const weekdays = weekdaysFromForm(parsed.weekdays)
    const row = await prisma.shiftTemplate.update({
      where: { id: parsed.id },
      data: {
        locationId: parsed.locationId,
        userId: parsed.userId,
        type: parsed.type,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        weekdays,
        notes: parsed.notes || null,
        isActive: parsed.isActive ?? existing.isActive,
      },
      include: templateInclude,
    })

    await logActivity({
      userId: session.userId,
      activity: "SHIFT_TEMPLATE_UPDATE",
      activityData: { templateId: row.id },
    })

    return toPublicTemplate(row)
  })
}

export async function deleteShiftTemplate(
  id: string,
): Promise<ActionResult<true>> {
  return withErrorBoundary(async () => {
    const session = await requireSession()
    const existing = await prisma.shiftTemplate.findFirst({
      where: { id, deletedAt: null },
    })
    if (!existing) {
      throw new AppError({
        kind: "not_found",
        code: "SHIFT_TEMPLATE_NOT_FOUND",
        message: "That shift template could not be found.",
      })
    }

    await assertCanWriteShiftsAtLocation(session, existing.locationId)

    await prisma.shiftTemplate.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    })

    await logActivity({
      userId: session.userId,
      activity: "SHIFT_TEMPLATE_DELETE",
      activityData: { templateId: id },
    })

    return true as const
  })
}

export async function generateShiftInstances(
  input: unknown,
): Promise<ActionResult<{ created: number }>> {
  return withErrorBoundary(async () => {
    const session = await requireSession()
    const parsed = generateShiftInstancesSchema.parse(input)

    const template = await prisma.shiftTemplate.findFirst({
      where: { id: parsed.templateId, deletedAt: null },
    })
    if (!template) {
      throw new AppError({
        kind: "not_found",
        code: "SHIFT_TEMPLATE_NOT_FOUND",
        message: "That shift template could not be found.",
      })
    }

    await assertCanWriteShiftsAtLocation(session, template.locationId)

    const from = parseDateOnly(parsed.from)
    const to = parseDateOnly(parsed.to)
    const weekdaySet = new Set(template.weekdays)

    let created = 0
    for (
      let cursor = new Date(from);
      cursor.getTime() <= to.getTime();
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    ) {
      const weekday = cursor.getUTCDay()
      if (!weekdaySet.has(weekday)) continue

      const date = new Date(cursor)
      const existing = await prisma.shiftInstance.findFirst({
        where: {
          deletedAt: null,
          userId: template.userId,
          date,
          startTime: template.startTime,
          endTime: template.endTime,
        },
        select: { id: true },
      })
      if (existing) continue

      await prisma.shiftInstance.create({
        data: {
          templateId: template.id,
          locationId: template.locationId,
          userId: template.userId,
          date,
          type: template.type,
          startTime: template.startTime,
          endTime: template.endTime,
          status: "SCHEDULED",
          notes: template.notes,
        },
      })
      created += 1
    }

    await logActivity({
      userId: session.userId,
      activity: "SHIFT_TEMPLATE_GENERATE",
      activityData: {
        templateId: template.id,
        from: formatDateOnly(from),
        to: formatDateOnly(to),
        created,
      },
    })

    return { created }
  })
}
