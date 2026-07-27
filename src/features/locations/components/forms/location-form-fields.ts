import type { FieldDef } from "@/components/shared/forms/types"
import type { LocationFormValues } from "@/features/locations/types/location-types"
import {
  locationDescriptionSchema,
  locationIsActiveSchema,
  locationManagerIdSchema,
  locationMinimumStaffSchema,
  locationNameSchema,
} from "@/lib/schemas/location"

export type SelectOption = { label: string; value: string }

const noneOption: SelectOption = { label: "None", value: "" }

export function buildLocationFormFields(
  managerOptions: SelectOption[] = [],
): FieldDef<LocationFormValues>[] {
  return [
    {
      name: "name",
      type: "text",
      label: "Name",
      placeholder: "Headquarters",
      validation: locationNameSchema,
    },
    {
      name: "managerId",
      type: "select",
      label: "Location manager",
      placeholder: "Assign a manager",
      description:
        "Admins assign a user who can manage staff and shifts at this location.",
      validation: locationManagerIdSchema,
      options: [noneOption, ...managerOptions],
    },
    {
      name: "minimumStaff",
      type: "number",
      label: "Minimum staff",
      placeholder: "0",
      description: "Target headcount for this location.",
      validation: locationMinimumStaffSchema,
      defaultValue: 0,
    },
    {
      name: "description",
      type: "textarea",
      label: "Description",
      placeholder: "Optional description",
      validation: locationDescriptionSchema,
    },
    {
      name: "isActive",
      type: "switch",
      label: "Active",
      validation: locationIsActiveSchema,
      defaultValue: true,
    },
  ]
}

/** Static fields without manager options — prefer buildLocationFormFields. */
export const locationFormFields = buildLocationFormFields()
