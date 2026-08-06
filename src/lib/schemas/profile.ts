import { z } from "zod"
import {
  userFirstNameSchema,
  userLastNameSchema,
  userPasswordOptionalSchema,
  userPictureUrlSchema,
} from "@/lib/schemas/user"

export const updateOwnProfileSchema = z.object({
  firstName: userFirstNameSchema,
  lastName: userLastNameSchema,
  pictureUrl: userPictureUrlSchema,
  password: userPasswordOptionalSchema,
})

export type UpdateOwnProfileInput = z.infer<typeof updateOwnProfileSchema>
