import type { FieldDef } from "@/components/shared/forms/types"
import type { ProfileFormValues } from "@/features/profile/types/profile-types"
import {
  userFirstNameSchema,
  userLastNameSchema,
  userPasswordOptionalSchema,
  userPictureUrlSchema,
} from "@/lib/schemas/user"

export const profileFormFields: FieldDef<ProfileFormValues>[] = [
  {
    name: "firstName",
    type: "text",
    label: "First name",
    placeholder: "Ada",
    validation: userFirstNameSchema,
  },
  {
    name: "lastName",
    type: "text",
    label: "Last name",
    placeholder: "Lovelace",
    validation: userLastNameSchema,
  },
  {
    name: "pictureUrl",
    type: "text",
    label: "Picture URL",
    placeholder: "https://…",
    validation: userPictureUrlSchema,
    colSpan: 2,
  },
  {
    name: "password",
    type: "password",
    label: "New password",
    placeholder: "Leave blank to keep current",
    description: "Use at least 8 characters.",
    validation: userPasswordOptionalSchema,
    colSpan: 2,
  },
]
