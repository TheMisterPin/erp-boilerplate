"use client"

import { useEffect, useMemo, useState } from "react"
import type { UseFormReturn } from "react-hook-form"

import { DynamicForm } from "@/components/shared/forms/templates"
import { LayoutMode } from "@/components/shared/forms/types"
import { useError } from "@/features/errors"
import { listManagedLocations } from "@/features/shifts/actions/shift-template-actions"
import {
  buildShiftTemplateFormFields,
  type SelectOption,
} from "@/features/shifts/components/forms/shift-template-form-fields"
import type { ShiftTemplateFormValues } from "@/features/shifts/types/shift-types"
import { listUsers } from "@/features/users/actions/user-actions"

type ShiftTemplateFormProps = {
  isEdit?: boolean
  initialValues?: Partial<ShiftTemplateFormValues>
  onSubmit: (
    values: ShiftTemplateFormValues,
    form: UseFormReturn<ShiftTemplateFormValues>,
  ) => void | Promise<void>
  submitLabel?: string
  onDirtyChange?: (isDirty: boolean) => void
}

export function ShiftTemplateForm({
  isEdit = false,
  initialValues,
  onSubmit,
  submitLabel,
  onDirtyChange,
}: ShiftTemplateFormProps) {
  const { run } = useError()
  const [locationOptions, setLocationOptions] = useState<SelectOption[]>([])
  const [userOptions, setUserOptions] = useState<SelectOption[]>([])
  const [optionsLoaded, setOptionsLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [locations, users] = await Promise.all([
        run(listManagedLocations()),
        run(listUsers()),
      ])
      if (cancelled) return
      setLocationOptions(
        (locations ?? []).map((location) => ({
          label: location.name,
          value: location.id,
        })),
      )
      setUserOptions(
        (users ?? []).map((user) => ({
          label: user.fullName,
          value: user.id,
        })),
      )
      setOptionsLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [run])

  const fields = useMemo(
    () => buildShiftTemplateFormFields({ locationOptions, userOptions }),
    [locationOptions, userOptions],
  )

  if (!optionsLoaded) {
    return (
      <p className="text-sm text-muted-foreground">Loading form options…</p>
    )
  }

  return (
    <DynamicForm<ShiftTemplateFormValues>
      fields={fields}
      layout={{ mode: LayoutMode.Single, columns: 2 }}
      isEdit={isEdit}
      initialValues={initialValues}
      onSubmit={onSubmit}
      submitLabel={
        submitLabel ?? (isEdit ? "Save changes" : "Create template")
      }
      onDirtyChange={onDirtyChange}
    />
  )
}
