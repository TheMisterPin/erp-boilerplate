"use server"

import { requireSession } from "@/features/auth/session"
import type { ActionResult } from "@/features/errors/dto"
import { AppError, withErrorBoundary } from "@/features/errors/server"
import { logActivity } from "@/features/logging/server"
import type {
  Profile,
  ProfilePageData,
} from "@/features/profile/types/profile-types"
import {
  formatDateOnly,
  parseDateOnly,
} from "@/features/shifts/actions/shift-access"
import type { ShiftInstance } from "@/features/shifts/types/shift-types"
import type { TimeOffRequest } from "@/features/time-off/types/time-off-types"
import { prisma } from "@/lib/db"
import { updateOwnProfileSchema } from "@/lib/schemas/profile"

function profileInclude(organizationId: string) {
  return {
    memberships: {
      where: { organizationId, status: "ACTIVE" as const },
      take: 1,
      select: {
        departmentId: true,
        department: { select: { name: true } },
        locationId: true,
        location: { select: { name: true } },
      },
    },
  }
}

const ownShiftInclude = {
  location: { select: { name: true } },
  user: { select: { fullName: true } },
} as const

function ownTimeOffInclude(organizationId: string) {
  return {
    user: {
      select: {
        fullName: true,
        memberships: {
          where: { organizationId, status: "ACTIVE" as const },
          take: 1,
          select: { locationId: true },
        },
      },
    },
    reviewedBy: { select: { fullName: true } },
  }
}

function toProfile(row: {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  pictureUrl: string | null
  memberships: Array<{
    departmentId: string | null
    department: { name: string } | null
    locationId: string | null
    location: { name: string } | null
  }>
}, role: Profile["role"]): Profile {
  const membership = row.memberships[0]
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: row.fullName,
    role,
    pictureUrl: row.pictureUrl,
    departmentId: membership?.departmentId ?? null,
    departmentName: membership?.department?.name ?? null,
    locationId: membership?.locationId ?? null,
    locationName: membership?.location?.name ?? null,
  }
}

function toOwnShift(row: {
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
}): ShiftInstance {
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

function toOwnTimeOffRequest(row: {
  id: string
  userId: string
  type: TimeOffRequest["type"]
  status: TimeOffRequest["status"]
  startDate: Date
  endDate: Date
  note: string | null
  reviewedById: string | null
  reviewedAt: Date | null
  reviewNote: string | null
  createdAt: Date
  updatedAt: Date
  user: { fullName: string; memberships: Array<{ locationId: string | null }> }
  reviewedBy: { fullName: string } | null
}): TimeOffRequest {
  return {
    id: row.id,
    userId: row.userId,
    userName: row.user.fullName,
    userLocationId: row.user.memberships[0]?.locationId ?? null,
    type: row.type,
    status: row.status,
    startDate: formatDateOnly(row.startDate),
    endDate: formatDateOnly(row.endDate),
    note: row.note,
    reviewedById: row.reviewedById,
    reviewedByName: row.reviewedBy?.fullName ?? null,
    reviewedAt: row.reviewedAt,
    reviewNote: row.reviewNote,
    canReview: false,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function fullNameFrom(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim()
}

function userNotFound(): AppError {
  return new AppError({
    kind: "not_found",
    code: "USER_NOT_FOUND",
    message: "Your profile could not be found.",
  })
}

async function loadOwnUpcomingShifts(userId: string, organizationId: string): Promise<ShiftInstance[]> {
  const rows = await prisma.shiftInstance.findMany({
    where: {
      deletedAt: null,
      userId,
      organizationId,
      status: "SCHEDULED",
      date: { gte: parseDateOnly(new Date()) },
    },
    include: ownShiftInclude,
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    take: 10,
  })
  return rows.map(toOwnShift)
}

async function loadOwnTimeOffRequests(
  userId: string,
  organizationId: string,
): Promise<TimeOffRequest[]> {
  const rows = await prisma.timeOffRequest.findMany({
    where: { organizationId, deletedAt: null, userId },
    include: ownTimeOffInclude(organizationId),
    orderBy: { createdAt: "desc" },
  })
  return rows.map(toOwnTimeOffRequest)
}

export async function loadProfilePage(): Promise<ActionResult<ProfilePageData>> {
  return withErrorBoundary(async () => {
    const session = await requireSession()
    const row = await prisma.user.findFirst({
      where: { id: session.userId, deletedAt: null },
      include: profileInclude(session.activeOrganizationId),
    })
    if (!row) throw userNotFound()

    const [upcomingShifts, ownRequests] = await Promise.all([
      loadOwnUpcomingShifts(session.userId, session.activeOrganizationId),
      loadOwnTimeOffRequests(session.userId, session.activeOrganizationId),
    ])

    return {
      profile: toProfile(row, session.role),
      upcomingShifts,
      ownRequests,
    }
  })
}

export async function getProfile(): Promise<ActionResult<Profile>> {
  return withErrorBoundary(async () => {
    const session = await requireSession()
    const row = await prisma.user.findFirst({
      where: { id: session.userId, deletedAt: null },
      include: profileInclude(session.activeOrganizationId),
    })
    if (!row) throw userNotFound()
    return toProfile(row, session.role)
  })
}

export async function listOwnTimeOffRequests(): Promise<
  ActionResult<TimeOffRequest[]>
> {
  return withErrorBoundary(async () => {
    const session = await requireSession()
    return loadOwnTimeOffRequests(session.userId, session.activeOrganizationId)
  })
}

export async function updateOwnProfile(
  input: unknown,
): Promise<ActionResult<Profile>> {
  return withErrorBoundary(async () => {
    const session = await requireSession()
    const parsed = updateOwnProfileSchema.parse(input)
    const pictureUrl = parsed.pictureUrl || null
    const data: {
      firstName: string
      lastName: string
      fullName: string
      pictureUrl: string | null
    } = {
      firstName: parsed.firstName.trim(),
      lastName: parsed.lastName.trim(),
      fullName: fullNameFrom(parsed.firstName, parsed.lastName),
      pictureUrl,
    }

    const update = await prisma.user.updateMany({
      where: { id: session.userId, deletedAt: null },
      data,
    })
    if (update.count === 0) throw userNotFound()

    const row = await prisma.user.findFirst({
      where: { id: session.userId, deletedAt: null },
      include: profileInclude(session.activeOrganizationId),
    })
    if (!row) throw userNotFound()

    await logActivity({
      userId: session.userId,
      organizationId: session.activeOrganizationId,
      activity: "PROFILE_UPDATE",
      activityData: {
        fields: Object.keys(data),
      },
    })

    return toProfile(row, session.role)
  })
}
