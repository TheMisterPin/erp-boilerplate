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
    locationId: string | null
  }
  reviewedBy: {
    fullName: string
  } | null
}

const timeOffRequestInclude = {
  user: { select: { fullName: true, locationId: true } },
  reviewedBy: { select: { fullName: true } },
} as const

function toPublicRequest(
  row: TimeOffRequestRow,
  canReview: boolean,
): TimeOffRequest {
  return {
    id: row.id,
    userId: row.userId,
    userName: row.user.fullName,
    userLocationId: row.user.locationId,
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

    let where: Prisma.TimeOffRequestWhereInput = { deletedAt: null }
    if (session.role !== "ADMIN" && managedIds.length > 0) {
      where = {
        deletedAt: null,
        OR: [
          { userId: session.userId },
          { user: { locationId: { in: managedIds } } },
        ],
      }
    } else if (session.role !== "ADMIN") {
      where = { deletedAt: null, userId: session.userId }
    }

    const rows = await prisma.timeOffRequest.findMany({
      where,
      include: timeOffRequestInclude,
      orderBy: { createdAt: "desc" },
    })

    return Promise.all(
      rows.map(async (row) =>
        toPublicRequest(
          row,
          await canReviewTimeOff(session, row.user.locationId),
        ),
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
        userId: session.userId,
        type: parsed.type,
        status: "PENDING",
        startDate: parseDateOnly(parsed.startDate),
        endDate: parseDateOnly(parsed.endDate),
        note: parsed.note || null,
      },
      include: timeOffRequestInclude,
    })

    await logActivity({
      userId: session.userId,
      activity: "TIME_OFF_REQUEST",
      activityData: { requestId: row.id },
    })

    return toPublicRequest(
      row,
      await canReviewTimeOff(session, row.user.locationId),
    )
  })
}

export async function cancelTimeOffRequest(
  id: string,
): Promise<ActionResult<TimeOffRequest>> {
  return withErrorBoundary(async () => {
    const session = await authorize(Actions.timeOff.write)
    const existing = await prisma.timeOffRequest.findFirst({
      where: { id, deletedAt: null },
      include: timeOffRequestInclude,
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
      where: { id, status: "PENDING", deletedAt: null },
      data: { status: "CANCELLED" },
    })
    if (transition.count === 0) throw requestNotPending()

    const row = await prisma.timeOffRequest.findUnique({
      where: { id },
      include: timeOffRequestInclude,
    })
    if (!row) throw requestNotFound()

    await logActivity({
      userId: session.userId,
      activity: "TIME_OFF_CANCEL",
      activityData: { requestId: row.id },
    })

    return toPublicRequest(
      row,
      await canReviewTimeOff(session, row.user.locationId),
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
      where: { id: parsed.id, deletedAt: null },
      include: timeOffRequestInclude,
    })
    if (!existing) throw requestNotFound()

    await assertCanReviewTimeOff(session, existing.user.locationId)
    if (existing.status !== "PENDING") throw requestNotPending()

    const reviewedAt = new Date()
    const row = await prisma.$transaction(async (transaction) => {
      const transition = await transaction.timeOffRequest.updateMany({
        where: {
          id: existing.id,
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
          deletedAt: null,
          status: "SCHEDULED",
          date: {
            gte: existing.startDate,
            lte: existing.endDate,
          },
        },
        data: { status: "CANCELLED" },
      })
      await transaction.userActivity.create({
        data: {
          userId: session.userId,
          activity: "TIME_OFF_APPROVE",
          activityData: {
            requestId: existing.id,
            cancelledShiftCount: cancelled.count,
          },
        },
      })

      const updated = await transaction.timeOffRequest.findUnique({
        where: { id: existing.id },
        include: timeOffRequestInclude,
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
      where: { id: parsed.id, deletedAt: null },
      include: timeOffRequestInclude,
    })
    if (!existing) throw requestNotFound()

    await assertCanReviewTimeOff(session, existing.user.locationId)
    if (existing.status !== "PENDING") throw requestNotPending()

    const transition = await prisma.timeOffRequest.updateMany({
      where: {
        id: existing.id,
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
      include: timeOffRequestInclude,
    })
    if (!row) throw requestNotFound()

    await logActivity({
      userId: session.userId,
      activity: "TIME_OFF_REJECT",
      activityData: { requestId: row.id },
    })

    return toPublicRequest(row, true)
  })
}
