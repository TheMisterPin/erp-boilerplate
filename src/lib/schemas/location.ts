import { z } from "zod"

/** Shared field validators — used by FieldDefs and the server schema. */

export const locationNameSchema = z.string().min(1, "Required")

export const locationDescriptionSchema = z.string().optional()

export const locationIsActiveSchema = z.boolean().optional()

export const locationMinimumStaffSchema = z.coerce
  .number({ invalid_type_error: "Enter a number" })
  .int("Must be a whole number")
  .min(0, "Must be 0 or more")

/** Empty string or valid UUID. Coerce empty → null in actions. */
export const locationManagerIdSchema = z
  .string()
  .refine(
    (value) => value === "" || z.string().uuid().safeParse(value).success,
    "Invalid manager id",
  )
  .optional()

/** Create location payload. */
export const createLocationSchema = z.object({
  name: locationNameSchema,
  description: locationDescriptionSchema,
  managerId: locationManagerIdSchema,
  minimumStaff: locationMinimumStaffSchema.optional(),
  isActive: locationIsActiveSchema,
})

/** Update location payload. */
export const updateLocationSchema = z.object({
  id: z.string().uuid("Invalid location id"),
  name: locationNameSchema,
  description: locationDescriptionSchema,
  managerId: locationManagerIdSchema,
  minimumStaff: locationMinimumStaffSchema.optional(),
  isActive: locationIsActiveSchema,
})

export type CreateLocationInput = z.infer<typeof createLocationSchema>
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>
