import type { FieldDef } from "@/components/shared/forms/types"
import type { ShiftInstanceFormValues } from "@/features/shifts/types/shift-types"
import {
  shiftDateSchema,
  shiftLocationIdSchema,
  shiftNotesSchema,
  shiftStatusSchema,
  shiftTimeSchema,
  shiftTypeSchema,
  shiftUserIdSchema,
} from "@/lib/schemas/shift"

export type SelectOption = { label: string; value: string }

const typeOptions: SelectOption[] = [
  { label: "Morning", value: "MORNING" },
  { label: "Afternoon", value: "AFTERNOON" },
  { label: "Night", value: "NIGHT" },
  { label: "Full day", value: "FULL_DAY" },
]

const statusOptions: SelectOption[] = [
  { label: "Scheduled", value: "SCHEDULED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
]

type BuildInstanceFormFieldsOptions = {
  locationOptions?: SelectOption[]
  userOptions?: SelectOption[]
}

export function buildShiftInstanceFormFields(
  options: BuildInstanceFormFieldsOptions = {},
): FieldDef<ShiftInstanceFormValues>[] {
  const locationOptions = options.locationOptions ?? []
  const userOptions = options.userOptions ?? []

  return [
    {
      name: "date",
      type: "date",
      label: "Date",
      validation: shiftDateSchema,
      canEdit: false,
    },
    {
      name: "locationId",
      type: "select",
      label: "Location",
      placeholder: "Select a location",
      validation: shiftLocationIdSchema,
      options: locationOptions,
    },
    {
      name: "userId",
      type: "select",
      label: "Assignee",
      placeholder: "Select a user",
      validation: shiftUserIdSchema,
      options: userOptions,
    },
    {
      name: "type",
      type: "select",
      label: "Shift type",
      placeholder: "Select a type",
      validation: shiftTypeSchema,
      options: typeOptions,
      defaultValue: "MORNING",
    },
    {
      name: "startTime",
      type: "text",
      label: "Start time",
      placeholder: "06:00",
      validation: shiftTimeSchema,
      defaultValue: "06:00",
    },
    {
      name: "endTime",
      type: "text",
      label: "End time",
      placeholder: "14:00",
      validation: shiftTimeSchema,
      defaultValue: "14:00",
    },
    {
      name: "status",
      type: "select",
      label: "Status",
      validation: shiftStatusSchema,
      options: statusOptions,
      defaultValue: "SCHEDULED",
    },
    {
      name: "notes",
      type: "textarea",
      label: "Notes",
      validation: shiftNotesSchema,
    },
  ]
}
