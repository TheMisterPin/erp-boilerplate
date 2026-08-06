import type { FieldDef } from "@/components/shared/forms/types"
import type { TimeOffReviewFormValues } from "@/features/time-off/types/time-off-types"
import { timeOffNoteSchema } from "@/lib/schemas/time-off"

export const timeOffReviewFormFields: FieldDef<TimeOffReviewFormValues>[] = [
  {
    name: "reviewNote",
    type: "textarea",
    label: "Review note",
    placeholder: "Optional note for the employee",
    validation: timeOffNoteSchema,
  },
]
