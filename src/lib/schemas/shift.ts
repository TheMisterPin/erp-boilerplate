import { z } from "zod"

export const SHIFT_TYPE_VALUES = [
  "MORNING",
  "AFTERNOON",
  "NIGHT",
  "FULL_DAY",
] as const

export const SHIFT_STATUS_VALUES = [
  "SCHEDULED",
  "COMPLETED",
  "CANCELLED",
] as const

export const WEEKDAY_VALUES = ["0", "1", "2", "3", "4", "5", "6"] as const

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/

export const shiftTypeSchema = z.enum(SHIFT_TYPE_VALUES, {
  required_error: "Required",
})

export const shiftStatusSchema = z.enum(SHIFT_STATUS_VALUES, {
  required_error: "Required",
})

export const shiftTimeSchema = z
  .string()
  .regex(timeRegex, "Use HH:mm (24h)")

export const shiftNotesSchema = z.string().optional()

export const shiftIsActiveSchema = z.boolean().optional()

export const shiftLocationIdSchema = z.string().uuid("Invalid location id")

export const shiftUserIdSchema = z.string().uuid("Invalid user id")

/** Multiselect stores string weekday values; coerce to ints in actions. */
export const shiftWeekdaysSchema = z
  .array(z.enum(WEEKDAY_VALUES))
  .min(1, "Select at least one weekday")

export const shiftDateSchema = z.date({
  required_error: "Required",
  invalid_type_error: "Pick a date",
})

export const createShiftTemplateSchema = z.object({
  locationId: shiftLocationIdSchema,
  userId: shiftUserIdSchema,
  type: shiftTypeSchema,
  startTime: shiftTimeSchema,
  endTime: shiftTimeSchema,
  weekdays: shiftWeekdaysSchema,
  notes: shiftNotesSchema,
  isActive: shiftIsActiveSchema,
})

export const updateShiftTemplateSchema = createShiftTemplateSchema.extend({
  id: z.string().uuid("Invalid template id"),
})

export const generateShiftInstancesSchema = z
  .object({
    templateId: z.string().uuid("Invalid template id"),
    from: shiftDateSchema,
    to: shiftDateSchema,
  })
  .refine((value) => value.from.getTime() <= value.to.getTime(), {
    message: "End date must be on or after start date",
    path: ["to"],
  })

export const createShiftInstanceSchema = z.object({
  locationId: shiftLocationIdSchema,
  userId: shiftUserIdSchema,
  date: shiftDateSchema,
  type: shiftTypeSchema,
  startTime: shiftTimeSchema,
  endTime: shiftTimeSchema,
  status: shiftStatusSchema.optional(),
  notes: shiftNotesSchema,
  templateId: z.string().uuid().optional().nullable(),
})

export const updateShiftInstanceSchema = createShiftInstanceSchema.extend({
  id: z.string().uuid("Invalid shift id"),
})

export type CreateShiftTemplateInput = z.infer<typeof createShiftTemplateSchema>
export type UpdateShiftTemplateInput = z.infer<typeof updateShiftTemplateSchema>
export type GenerateShiftInstancesInput = z.infer<
  typeof generateShiftInstancesSchema
>
export type CreateShiftInstanceInput = z.infer<typeof createShiftInstanceSchema>
export type UpdateShiftInstanceInput = z.infer<typeof updateShiftInstanceSchema>
