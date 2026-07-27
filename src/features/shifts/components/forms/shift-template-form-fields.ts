import type { FieldDef } from "@/components/shared/forms/types"
import type {
  GenerateShiftFormValues,
  ShiftTemplateFormValues,
} from "@/features/shifts/types/shift-types"
import {
  shiftDateSchema,
  shiftIsActiveSchema,
  shiftLocationIdSchema,
  shiftNotesSchema,
  shiftTimeSchema,
  shiftTypeSchema,
  shiftUserIdSchema,
  shiftWeekdaysSchema,
} from "@/lib/schemas/shift"

export type SelectOption = { label: string; value: string }

const weekdayOptions: SelectOption[] = [
  { label: "Sunday", value: "0" },
  { label: "Monday", value: "1" },
  { label: "Tuesday", value: "2" },
  { label: "Wednesday", value: "3" },
  { label: "Thursday", value: "4" },
  { label: "Friday", value: "5" },
  { label: "Saturday", value: "6" },
]

const typeOptions: SelectOption[] = [
  { label: "Morning", value: "MORNING" },
  { label: "Afternoon", value: "AFTERNOON" },
  { label: "Night", value: "NIGHT" },
  { label: "Full day", value: "FULL_DAY" },
]

type BuildTemplateFormFieldsOptions = {
  locationOptions?: SelectOption[]
  userOptions?: SelectOption[]
}

export function buildShiftTemplateFormFields(
  options: BuildTemplateFormFieldsOptions = {},
): FieldDef<ShiftTemplateFormValues>[] {
  const locationOptions = options.locationOptions ?? []
  const userOptions = options.userOptions ?? []

  return [
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
      name: "weekdays",
      type: "multiselect",
      label: "Weekdays",
      validation: shiftWeekdaysSchema,
      options: weekdayOptions,
      defaultValue: ["1", "2", "3", "4", "5"],
    },
    {
      name: "notes",
      type: "textarea",
      label: "Notes",
      validation: shiftNotesSchema,
    },
    {
      name: "isActive",
      type: "switch",
      label: "Active",
      validation: shiftIsActiveSchema,
      defaultValue: true,
    },
  ]
}

export function buildGenerateShiftFormFields(): FieldDef<GenerateShiftFormValues>[] {
  return [
    {
      name: "from",
      type: "date",
      label: "From",
      validation: shiftDateSchema,
    },
    {
      name: "to",
      type: "date",
      label: "To",
      validation: shiftDateSchema,
    },
  ]
}
