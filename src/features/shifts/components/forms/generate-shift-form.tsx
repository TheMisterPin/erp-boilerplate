"use client"

import type { UseFormReturn } from "react-hook-form"

import { DynamicForm } from "@/components/shared/forms/templates"
import { LayoutMode } from "@/components/shared/forms/types"
import { buildGenerateShiftFormFields } from "@/features/shifts/components/forms/shift-template-form-fields"
import type { GenerateShiftFormValues } from "@/features/shifts/types/shift-types"

type GenerateShiftFormProps = {
  initialValues?: Partial<GenerateShiftFormValues>
  onSubmit: (
    values: GenerateShiftFormValues,
    form: UseFormReturn<GenerateShiftFormValues>,
  ) => void | Promise<void>
  onDirtyChange?: (isDirty: boolean) => void
}

export function GenerateShiftForm({
  initialValues,
  onSubmit,
  onDirtyChange,
}: GenerateShiftFormProps) {
  return (
    <DynamicForm<GenerateShiftFormValues>
      fields={buildGenerateShiftFormFields()}
      layout={{ mode: LayoutMode.Single, columns: 2 }}
      initialValues={initialValues}
      onSubmit={onSubmit}
      submitLabel="Generate shifts"
      onDirtyChange={onDirtyChange}
    />
  )
}
