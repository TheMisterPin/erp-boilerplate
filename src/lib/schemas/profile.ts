import { z } from "zod"
import {
  userFirstNameSchema,
  userLastNameSchema,
  userPictureUrlSchema,
} from "@/lib/schemas/user"

export const updateOwnProfileSchema = z.object({
  firstName: userFirstNameSchema,
  lastName: userLastNameSchema,
  pictureUrl: userPictureUrlSchema,
})

export type UpdateOwnProfileInput = z.infer<typeof updateOwnProfileSchema>
