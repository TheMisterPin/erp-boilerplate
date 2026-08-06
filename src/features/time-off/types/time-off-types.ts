import type {
  TimeOffStatus as PrismaTimeOffStatus,
  TimeOffType as PrismaTimeOffType,
} from "@/generated/prisma/client"

export type TimeOffType = PrismaTimeOffType
export type TimeOffStatus = PrismaTimeOffStatus

/** Public row returned by time-off actions. Dates are YYYY-MM-DD. */
export type TimeOffRequest = {
  id: string
  userId: string
  userName: string | null
  userLocationId: string | null
  type: TimeOffType
  status: TimeOffStatus
  startDate: string
  endDate: string
  note: string | null
  reviewedById: string | null
  reviewedByName: string | null
  reviewedAt: Date | null
  reviewNote: string | null
  /** Server-computed: current session may approve/reject this row. */
  canReview: boolean
  createdAt: Date
  updatedAt: Date
}

export type TimeOffRequestFormValues = {
  type: TimeOffType
  startDate: Date
  endDate: Date
  note?: string
}

export type TimeOffReviewFormValues = {
  reviewNote?: string
}
