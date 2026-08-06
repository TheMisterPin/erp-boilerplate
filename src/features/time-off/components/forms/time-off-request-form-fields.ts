import type { FieldDef } from "@/components/shared/forms/types"
import type { TimeOffRequestFormValues } from "@/features/time-off/types/time-off-types"
import {
  timeOffDateSchema,
  timeOffNoteSchema,
  timeOffTypeSchema,
} from "@/lib/schemas/time-off"

export const timeOffRequestFormFields: FieldDef<TimeOffRequestFormValues>[] = [
  {
    name: "type",
    type: "select",
    label: "Type",
    validation: timeOffTypeSchema,
    defaultValue: "TIME_OFF",
    options: [
      { label: "Time off", value: "TIME_OFF" },
      { label: "Sick", value: "SICK" },
    ],
  },
  {
    name: "startDate",
    type: "date",
    label: "Start date",
    validation: timeOffDateSchema,
  },
  {
    name: "endDate",
    type: "date",
    label: "End date",
    validation: timeOffDateSchema,
  },
  {
    name: "note",
    type: "textarea",
    label: "Note",
    placeholder: "Optional details",
    validation: timeOffNoteSchema,
    colSpan: 2,
  },
]
