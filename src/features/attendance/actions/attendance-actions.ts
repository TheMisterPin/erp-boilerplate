"use server"

import { requireSession, type AppSession } from "@/features/auth/session"
import type { ActionResult } from "@/features/errors/dto"
import { AppError, withErrorBoundary } from "@/features/errors/server"
import { logActivity } from "@/features/logging/server"
import type {
  ClockStatus,
  ShiftAttendance,
} from "@/features/attendance/types/attendance-types"
import { prisma } from "@/lib/db"
import {
  listManagedLocationIds,
  parseDateOnly,
} from "@/features/shifts/actions/shift-access"

type AttendanceRow = {
  id: string
  userId: string
  shiftInstanceId: string | null
  locationId: string | null
  checkInAt: Date
  checkOutAt: Date | null
  durationMinutes: number | null
  checkInActivityId: string | null
  checkOutActivityId: string | null
  user?: { fullName: string } | null
  location?: { name: string } | null
}

function elapsedMinutes(from: Date, to: Date = new Date()): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 60_000))
}

function toPublicAttendance(row: AttendanceRow): ShiftAttendance {
  const isOpen = row.checkOutAt == null
  return {
    id: row.id,
    userId: row.userId,
    userName: row.user?.fullName ?? null,
    shiftInstanceId: row.shiftInstanceId,
    locationId: row.locationId,
    locationName: row.location?.name ?? null,
    checkInAt: row.checkInAt,
    checkOutAt: row.checkOutAt,
    durationMinutes: row.durationMinutes,
    elapsedMinutes: isOpen
      ? elapsedMinutes(row.checkInAt)
      : row.durationMinutes,
    checkInActivityId: row.checkInActivityId,
    checkOutActivityId: row.checkOutActivityId,
    isOpen,
  }
}

const attendanceInclude = {
  user: { select: { fullName: true } },
  location: { select: { name: true } },
} as const

async function resolveListScope(session: AppSession): Promise<{
  userId?: string
  locationId?: { in: string[] }
}> {
  if (session.role === "ADMIN") return {}

  const managedIds = await listManagedLocationIds(session)
  if (managedIds.length > 0) {
    return { locationId: { in: managedIds } }
  }

  return { userId: session.userId }
}

export async function getClockStatus(): Promise<ActionResult<ClockStatus>> {
  return withErrorBoundary(async () => {
    const session = await requireSession()
    const user = await prisma.user.findFirst({
      where: {
        id: session.userId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        locationId: true,
      },
    })
    if (!user) {
      throw new AppError({
        kind: "auth",
        code: "SESSION_EXPIRED",
        message: "Your session has expired. Please sign in again.",
      })
    }

    const open = await prisma.shiftAttendance.findFirst({
      where: { userId: user.id, checkOutAt: null },
      include: attendanceInclude,
      orderBy: { checkInAt: "desc" },
    })

    const today = parseDateOnly(new Date())
    const todayShift = await prisma.shiftInstance.findFirst({
      where: {
        userId: user.id,
        deletedAt: null,
        date: today,
        status: { not: "CANCELLED" },
      },
      include: { location: { select: { name: true } } },
      orderBy: { startTime: "asc" },
    })

    return {
      me: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
      openAttendance: open ? toPublicAttendance(open) : null,
      todayShift: todayShift
        ? {
            id: todayShift.id,
            type: todayShift.type,
            startTime: todayShift.startTime,
            endTime: todayShift.endTime,
            locationName: todayShift.location?.name ?? null,
          }
        : null,
    }
  })
}

export async function listAttendances(): Promise<
  ActionResult<ShiftAttendance[]>
> {
  return withErrorBoundary(async () => {
    const session = await requireSession()
    const scope = await resolveListScope(session)

    const rows = await prisma.shiftAttendance.findMany({
      where: {
        ...scope,
      },
      include: attendanceInclude,
      orderBy: { checkInAt: "desc" },
      take: 100,
    })

    return rows.map(toPublicAttendance)
  })
}

export async function checkIn(): Promise<ActionResult<ShiftAttendance>> {
  return withErrorBoundary(async () => {
    const session = await requireSession()

    const open = await prisma.shiftAttendance.findFirst({
      where: { userId: session.userId, checkOutAt: null },
      select: { id: true },
    })
    if (open) {
      throw new AppError({
        kind: "conflict",
        code: "ALREADY_CHECKED_IN",
        message: "You are already checked in. Check out first.",
      })
    }

    const user = await prisma.user.findFirst({
      where: { id: session.userId, deletedAt: null, isActive: true },
      select: { id: true, locationId: true },
    })
    if (!user) {
      throw new AppError({
        kind: "auth",
        code: "SESSION_EXPIRED",
        message: "Your session has expired. Please sign in again.",
      })
    }

    const today = parseDateOnly(new Date())
    const todayShift = await prisma.shiftInstance.findFirst({
      where: {
        userId: user.id,
        deletedAt: null,
        date: today,
        status: { not: "CANCELLED" },
      },
      orderBy: { startTime: "asc" },
    })

    const locationId = todayShift?.locationId ?? user.locationId ?? null
    const checkInAt = new Date()

    const attendance = await prisma.shiftAttendance.create({
      data: {
        userId: user.id,
        shiftInstanceId: todayShift?.id ?? null,
        locationId,
        checkInAt,
      },
      include: attendanceInclude,
    })

    const activityId = await logActivity({
      userId: user.id,
      activity: "SHIFT_CHECK_IN",
      activityData: {
        attendanceId: attendance.id,
        shiftInstanceId: attendance.shiftInstanceId,
        locationId: attendance.locationId,
        checkInAt: checkInAt.toISOString(),
      },
    })

    const updated = await prisma.shiftAttendance.update({
      where: { id: attendance.id },
      data: { checkInActivityId: activityId },
      include: attendanceInclude,
    })

    return toPublicAttendance(updated)
  })
}

export async function checkOut(): Promise<ActionResult<ShiftAttendance>> {
  return withErrorBoundary(async () => {
    const session = await requireSession()

    const open = await prisma.shiftAttendance.findFirst({
      where: { userId: session.userId, checkOutAt: null },
      include: attendanceInclude,
      orderBy: { checkInAt: "desc" },
    })
    if (!open) {
      throw new AppError({
        kind: "conflict",
        code: "NOT_CHECKED_IN",
        message: "You are not checked in.",
      })
    }

    const checkOutAt = new Date()
    const duration = elapsedMinutes(open.checkInAt, checkOutAt)

    const activityId = await logActivity({
      userId: session.userId,
      activity: "SHIFT_CHECK_OUT",
      activityData: {
        attendanceId: open.id,
        shiftInstanceId: open.shiftInstanceId,
        locationId: open.locationId,
        checkInAt: open.checkInAt.toISOString(),
        checkOutAt: checkOutAt.toISOString(),
        durationMinutes: duration,
      },
    })

    const updated = await prisma.shiftAttendance.update({
      where: { id: open.id },
      data: {
        checkOutAt,
        durationMinutes: duration,
        checkOutActivityId: activityId,
      },
      include: attendanceInclude,
    })

    return toPublicAttendance(updated)
  })
}
