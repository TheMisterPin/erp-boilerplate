import { z } from "zod"

export const TIME_OFF_TYPE_VALUES = ["TIME_OFF", "SICK"] as const
export const TIME_OFF_STATUS_VALUES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const

export const timeOffTypeSchema = z.enum(TIME_OFF_TYPE_VALUES, {
  required_error: "Required",
})

export const timeOffNoteSchema = z.string().optional()

export const timeOffDateSchema = z.date({
  required_error: "Required",
  invalid_type_error: "Pick a date",
})

export const createTimeOffRequestSchema = z
  .object({
    type: timeOffTypeSchema,
    startDate: timeOffDateSchema,
    endDate: timeOffDateSchema,
    note: timeOffNoteSchema,
  })
  .refine((v) => v.endDate.getTime() >= v.startDate.getTime(), {
    message: "End date must be on or after start date",
    path: ["endDate"],
  })

export const reviewTimeOffRequestSchema = z.object({
  id: z.string().uuid("Invalid request id"),
  reviewNote: z.string().optional(),
})

export type CreateTimeOffRequestInput = z.infer<typeof createTimeOffRequestSchema>
export type ReviewTimeOffRequestInput = z.infer<typeof reviewTimeOffRequestSchema>
