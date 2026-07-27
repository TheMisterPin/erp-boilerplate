import type { FieldDef } from "@/components/shared/forms/types"
import type { AssignLocationFormValues } from "@/features/users/types/user-types"
import { z } from "zod"

export type SelectOption = { label: string; value: string }

const noneOption: SelectOption = { label: "Unassigned", value: "" }

export function buildAssignLocationFormFields(
  locationOptions: SelectOption[] = [],
): FieldDef<AssignLocationFormValues>[] {
  return [
    {
      name: "locationId",
      type: "select",
      label: "Location",
      placeholder: "Select a location",
      description: "Assign this member to a location you manage.",
      validation: z
        .string()
        .refine(
          (value) =>
            value === "" || z.string().uuid().safeParse(value).success,
          "Invalid location id",
        ),
      options: [noneOption, ...locationOptions],
    },
  ]
}
