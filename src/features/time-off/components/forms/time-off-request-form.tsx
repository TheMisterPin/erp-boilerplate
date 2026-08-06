"use client"

import { useMemo } from "react"
import type { UseFormReturn } from "react-hook-form"

import { DynamicForm } from "@/components/shared/forms/templates"
import { LayoutMode } from "@/components/shared/forms/types"
import { timeOffRequestFormFields } from "@/features/time-off/components/forms/time-off-request-form-fields"
import type {
  TimeOffRequestFormValues,
  TimeOffType,
} from "@/features/time-off/types/time-off-types"

export type TimeOffRequestFormProps = {
  /** When set, hide and lock the type field (used for Call in sick). */
  lockedType?: TimeOffType
  initialValues?: Partial<TimeOffRequestFormValues>
  onSubmit: (
    values: TimeOffRequestFormValues,
    form: UseFormReturn<TimeOffRequestFormValues>,
  ) => void | Promise<void>
  onDirtyChange?: (dirty: boolean) => void
  submitLabel?: string
}

export function TimeOffRequestForm({
  lockedType,
  initialValues,
  onSubmit,
  onDirtyChange,
  submitLabel = "Submit request",
}: TimeOffRequestFormProps) {
  const fields = useMemo(
    () =>
      lockedType
        ? timeOffRequestFormFields.filter((field) => field.name !== "type")
        : timeOffRequestFormFields,
    [lockedType],
  )
  const values = useMemo(
    () => ({
      ...initialValues,
      type: lockedType ?? initialValues?.type ?? "TIME_OFF",
    }),
    [initialValues, lockedType],
  )

  return (
    <DynamicForm<TimeOffRequestFormValues>
      fields={fields}
      layout={{ mode: LayoutMode.Single, columns: 2 }}
      initialValues={values}
      onSubmit={(submittedValues, form) =>
        onSubmit(
          {
            ...submittedValues,
            type: lockedType ?? submittedValues.type,
          },
          form,
        )
      }
      onDirtyChange={onDirtyChange}
      submitLabel={submitLabel}
    />
  )
}
