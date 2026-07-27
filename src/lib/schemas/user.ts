import { z } from "zod"

/** Shared field validators — used by FieldDefs and the server schema. */

export const userEmailSchema = z
  .string()
  .min(1, "Required")
  .email("Enter a valid email")

export const userFirstNameSchema = z.string().min(1, "Required")

export const userLastNameSchema = z.string().min(1, "Required")

export const userRoleSchema = z.enum(["ADMIN", "USER"], {
  required_error: "Required",
})

export const userPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")

export const userPasswordOptionalSchema = z
  .string()
  .refine(
    (value) => value === "" || value.length >= 8,
    "Password must be at least 8 characters",
  )
  .optional()

/** Empty string or valid UUID. Coerce empty → null in actions. */
export const userDepartmentIdSchema = z
  .string()
  .refine(
    (value) => value === "" || z.string().uuid().safeParse(value).success,
    "Invalid department id",
  )
  .optional()

/** Empty string or valid UUID. Coerce empty → null in actions. */
export const userLocationIdSchema = z
  .string()
  .refine(
    (value) => value === "" || z.string().uuid().safeParse(value).success,
    "Invalid location id",
  )
  .optional()

export const userPictureUrlSchema = z
  .string()
  .refine(
    (value) => value === "" || z.string().url().safeParse(value).success,
    "Enter a valid URL",
  )
  .optional()

export const userIsActiveSchema = z.boolean().optional()

export const userCreatedAtSchema = z.date().optional()

export const userUpdatedAtSchema = z.date().optional()

/** Create user payload. */
export const createUserSchema = z.object({
  email: userEmailSchema,
  firstName: userFirstNameSchema,
  lastName: userLastNameSchema,
  role: userRoleSchema,
  password: userPasswordSchema,
  departmentId: userDepartmentIdSchema,
  locationId: userLocationIdSchema,
  pictureUrl: userPictureUrlSchema,
  isActive: userIsActiveSchema,
})

/** Update user payload — password optional. */
export const updateUserSchema = z.object({
  id: z.string().uuid("Invalid user id"),
  email: userEmailSchema,
  firstName: userFirstNameSchema,
  lastName: userLastNameSchema,
  role: userRoleSchema,
  password: userPasswordOptionalSchema,
  departmentId: userDepartmentIdSchema,
  locationId: userLocationIdSchema,
  pictureUrl: userPictureUrlSchema,
  isActive: userIsActiveSchema,
})

/** @deprecated Use createUserSchema / updateUserSchema */
export const userSchema = createUserSchema

/** Assign (or clear) a user's location — used by managers and admins. */
export const assignUserLocationSchema = z.object({
  userId: z.string().uuid("Invalid user id"),
  locationId: z
    .string()
    .refine(
      (value) => value === "" || z.string().uuid().safeParse(value).success,
      "Invalid location id",
    ),
})

export type AssignUserLocationInput = z.infer<typeof assignUserLocationSchema>
