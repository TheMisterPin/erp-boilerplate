"use client"

import type { UseFormReturn } from "react-hook-form"

import { DynamicForm } from "@/components/shared/forms/templates"
import { LayoutMode } from "@/components/shared/forms/types"
import { timeOffReviewFormFields } from "@/features/time-off/components/forms/time-off-review-form-fields"
import type { TimeOffReviewFormValues } from "@/features/time-off/types/time-off-types"

export type TimeOffReviewFormProps = {
  initialValues?: Partial<TimeOffReviewFormValues>
  onSubmit: (
    values: TimeOffReviewFormValues,
    form: UseFormReturn<TimeOffReviewFormValues>,
  ) => void | Promise<void>
  onDirtyChange?: (dirty: boolean) => void
  submitLabel?: string
}

export function TimeOffReviewForm({
  initialValues,
  onSubmit,
  onDirtyChange,
  submitLabel = "Submit review",
}: TimeOffReviewFormProps) {
  return (
    <DynamicForm<TimeOffReviewFormValues>
      fields={timeOffReviewFormFields}
      layout={{ mode: LayoutMode.Single, columns: 1 }}
      initialValues={initialValues}
      onSubmit={onSubmit}
      onDirtyChange={onDirtyChange}
      submitLabel={submitLabel}
    />
  )
}
