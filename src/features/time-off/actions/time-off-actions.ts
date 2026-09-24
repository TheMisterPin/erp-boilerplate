"use server"

import { Actions } from "@/features/auth/permissions"
import { authorize, requireSession } from "@/features/auth/session"
import type { ActionResult } from "@/features/errors/dto"
import { AppError, withErrorBoundary } from "@/features/errors/server"
import { logActivity } from "@/features/logging/server"
import {
  formatDateOnly,
  listManagedLocationIds,
  parseDateOnly,
} from "@/features/shifts/actions/shift-access"
import {
  assertCanReviewTimeOff,
  canReviewTimeOff,
} from "@/features/time-off/actions/time-off-access"
import type { TimeOffRequest } from "@/features/time-off/types/time-off-types"
import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/db"
import {
  createTimeOffRequestSchema,
  reviewTimeOffRequestSchema,
} from "@/lib/schemas/time-off"

type TimeOffRequestRow = {
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
  user: {
    fullName: string
    memberships: Array<{ locationId: string | null }>
  }
  reviewedBy: {
    fullName: string
  } | null
}

function timeOffRequestInclude(organizationId: string) {
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

function requesterLocation(row: TimeOffRequestRow): string | null {
  return row.user.memberships[0]?.locationId ?? null
}

function toPublicRequest(
  row: TimeOffRequestRow,
  canReview: boolean,
): TimeOffRequest {
  return {
    id: row.id,
    userId: row.userId,
    userName: row.user.fullName,
    userLocationId: requesterLocation(row),
    type: row.type,
    status: row.status,
    startDate: formatDateOnly(row.startDate),
    endDate: formatDateOnly(row.endDate),
    note: row.note,
    reviewedById: row.reviewedById,
    reviewedByName: row.reviewedBy?.fullName ?? null,
    reviewedAt: row.reviewedAt,
    reviewNote: row.reviewNote,
    canReview,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function requestNotFound(): AppError {
  return new AppError({
    kind: "not_found",
    code: "TIME_OFF_REQUEST_NOT_FOUND",
    message: "That time-off request could not be found.",
  })
}

function requestNotPending(): AppError {
  return new AppError({
    kind: "conflict",
    code: "TIME_OFF_REQUEST_NOT_PENDING",
    message: "Only pending time-off requests can be changed.",
  })
}

export async function listTimeOffRequests(): Promise<
  ActionResult<TimeOffRequest[]>
> {
  return withErrorBoundary(async () => {
    const session = await authorize(Actions.timeOff.read)
    const managedIds = await listManagedLocationIds(session)

    let where: Prisma.TimeOffRequestWhereInput = { organizationId: session.activeOrganizationId, deletedAt: null }
    if (session.role !== "ADMIN" && managedIds.length > 0) {
      where = {
        deletedAt: null,
        organizationId: session.activeOrganizationId,
        OR: [
          { userId: session.userId },
          { user: { memberships: { some: { organizationId: session.activeOrganizationId, locationId: { in: managedIds }, status: "ACTIVE" } } } },
        ],
      }
    } else if (session.role !== "ADMIN") {
      where = { organizationId: session.activeOrganizationId, deletedAt: null, userId: session.userId }
    }

    const rows = await prisma.timeOffRequest.findMany({
      where,
      include: timeOffRequestInclude(session.activeOrganizationId),
      orderBy: { createdAt: "desc" },
    })

    const isAdmin = session.role === "ADMIN"
    const managedIdSet = new Set(managedIds)
    return rows.map((row) =>
      toPublicRequest(
        row,
        isAdmin ||
          (row.userId !== session.userId &&
            requesterLocation(row) !== null &&
            managedIdSet.has(requesterLocation(row)!)),
      ),
    )
  })
}

export async function createTimeOffRequest(
  input: unknown,
): Promise<ActionResult<TimeOffRequest>> {
  return withErrorBoundary(async () => {
    const session = await authorize(Actions.timeOff.write)
    const parsed = createTimeOffRequestSchema.parse(input)

    const row = await prisma.timeOffRequest.create({
      data: {
        organizationId: session.activeOrganizationId,
        userId: session.userId,
        type: parsed.type,
        status: "PENDING",
        startDate: parseDateOnly(parsed.startDate),
        endDate: parseDateOnly(parsed.endDate),
        note: parsed.note || null,
      },
      include: timeOffRequestInclude(session.activeOrganizationId),
    })

    await logActivity({
      userId: session.userId,
      organizationId: session.activeOrganizationId,
      activity: "TIME_OFF_REQUEST",
      activityData: { requestId: row.id },
    })

    return toPublicRequest(
      row,
      await canReviewTimeOff(session, row.userId, requesterLocation(row)),
    )
  })
}

export async function cancelTimeOffRequest(
  id: string,
): Promise<ActionResult<TimeOffRequest>> {
  return withErrorBoundary(async () => {
    const session = await authorize(Actions.timeOff.write)
    const existing = await prisma.timeOffRequest.findFirst({
      where: { id, organizationId: session.activeOrganizationId, deletedAt: null },
      include: timeOffRequestInclude(session.activeOrganizationId),
    })
    if (!existing) throw requestNotFound()
    if (existing.userId !== session.userId) {
      throw new AppError({
        kind: "permission",
        code: "FORBIDDEN",
        message: "You can only cancel your own time-off requests.",
      })
    }
    if (existing.status !== "PENDING") throw requestNotPending()

    const transition = await prisma.timeOffRequest.updateMany({
      where: { id, organizationId: session.activeOrganizationId, status: "PENDING", deletedAt: null },
      data: { status: "CANCELLED" },
    })
    if (transition.count === 0) throw requestNotPending()

    const row = await prisma.timeOffRequest.findUnique({
      where: { id },
      include: timeOffRequestInclude(session.activeOrganizationId),
    })
    if (!row) throw requestNotFound()

    await logActivity({
      userId: session.userId,
      organizationId: session.activeOrganizationId,
      activity: "TIME_OFF_CANCEL",
      activityData: { requestId: row.id },
    })

    return toPublicRequest(
      row,
      await canReviewTimeOff(session, row.userId, requesterLocation(row)),
    )
  })
}

export async function approveTimeOffRequest(
  input: unknown,
): Promise<ActionResult<TimeOffRequest>> {
  return withErrorBoundary(async () => {
    const session = await requireSession()
    const parsed = reviewTimeOffRequestSchema.parse(input)
    const existing = await prisma.timeOffRequest.findFirst({
      where: { id: parsed.id, organizationId: session.activeOrganizationId, deletedAt: null },
      include: timeOffRequestInclude(session.activeOrganizationId),
    })
    if (!existing) throw requestNotFound()

    await assertCanReviewTimeOff(
      session,
      existing.userId,
      requesterLocation(existing),
    )
    if (existing.status !== "PENDING") throw requestNotPending()

    const reviewedAt = new Date()
    const row = await prisma.$transaction(async (transaction) => {
      const transition = await transaction.timeOffRequest.updateMany({
        where: {
          id: existing.id,
          organizationId: session.activeOrganizationId,
          status: "PENDING",
          deletedAt: null,
        },
        data: {
          status: "APPROVED",
          reviewedById: session.userId,
          reviewedAt,
          reviewNote: parsed.reviewNote || null,
        },
      })
      if (transition.count === 0) throw requestNotPending()

      const cancelled = await transaction.shiftInstance.updateMany({
        where: {
          userId: existing.userId,
          organizationId: session.activeOrganizationId,
          deletedAt: null,
          status: "SCHEDULED",
          date: {
            gte: existing.startDate,
            lte: existing.endDate,
          },
        },
        data: { status: "CANCELLED" },
      })
      await logActivity(
        {
          userId: session.userId,
          organizationId: session.activeOrganizationId,
          activity: "TIME_OFF_APPROVE",
          activityData: {
            requestId: existing.id,
            cancelledShiftCount: cancelled.count,
          },
        },
        transaction,
      )

      const updated = await transaction.timeOffRequest.findUnique({
        where: { id: existing.id },
        include: timeOffRequestInclude(session.activeOrganizationId),
      })
      if (!updated) throw requestNotFound()
      return updated
    })

    return toPublicRequest(row, true)
  })
}

export async function rejectTimeOffRequest(
  input: unknown,
): Promise<ActionResult<TimeOffRequest>> {
  return withErrorBoundary(async () => {
    const session = await requireSession()
    const parsed = reviewTimeOffRequestSchema.parse(input)
    const existing = await prisma.timeOffRequest.findFirst({
      where: { id: parsed.id, organizationId: session.activeOrganizationId, deletedAt: null },
      include: timeOffRequestInclude(session.activeOrganizationId),
    })
    if (!existing) throw requestNotFound()

    await assertCanReviewTimeOff(
      session,
      existing.userId,
      requesterLocation(existing),
    )
    if (existing.status !== "PENDING") throw requestNotPending()

    const transition = await prisma.timeOffRequest.updateMany({
      where: {
        id: existing.id,
        organizationId: session.activeOrganizationId,
        status: "PENDING",
        deletedAt: null,
      },
      data: {
        status: "REJECTED",
        reviewedById: session.userId,
        reviewedAt: new Date(),
        reviewNote: parsed.reviewNote || null,
      },
    })
    if (transition.count === 0) throw requestNotPending()

    const row = await prisma.timeOffRequest.findUnique({
      where: { id: existing.id },
      include: timeOffRequestInclude(session.activeOrganizationId),
    })
    if (!row) throw requestNotFound()

    await logActivity({
      userId: session.userId,
      organizationId: session.activeOrganizationId,
      activity: "TIME_OFF_REJECT",
      activityData: { requestId: row.id },
    })

    return toPublicRequest(row, true)
  })
}
