"use client"

import { useEffect, useMemo, useState } from "react"
import type { UseFormReturn } from "react-hook-form"

import { DynamicForm } from "@/components/shared/forms/templates"
import { LayoutMode } from "@/components/shared/forms/types"
import { useError } from "@/features/errors"
import { listManagedLocations } from "@/features/shifts/actions/shift-template-actions"
import {
  buildShiftInstanceFormFields,
  type SelectOption,
} from "@/features/shifts/components/forms/shift-instance-form-fields"
import type { ShiftInstanceFormValues } from "@/features/shifts/types/shift-types"
import { listUsers } from "@/features/users/actions/user-actions"

type ShiftInstanceFormProps = {
  initialValues?: Partial<ShiftInstanceFormValues>
  onSubmit: (
    values: ShiftInstanceFormValues,
    form: UseFormReturn<ShiftInstanceFormValues>,
  ) => void | Promise<void>
  submitLabel?: string
  onDirtyChange?: (isDirty: boolean) => void
}

export function ShiftInstanceForm({
  initialValues,
  onSubmit,
  submitLabel,
  onDirtyChange,
}: ShiftInstanceFormProps) {
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
    () => buildShiftInstanceFormFields({ locationOptions, userOptions }),
    [locationOptions, userOptions],
  )

  if (!optionsLoaded) {
    return (
      <p className="text-sm text-muted-foreground">Loading form options…</p>
    )
  }

  return (
    <DynamicForm<ShiftInstanceFormValues>
      fields={fields}
      layout={{ mode: LayoutMode.Single, columns: 2 }}
      isEdit
      initialValues={initialValues}
      onSubmit={onSubmit}
      submitLabel={submitLabel ?? "Assign shift"}
      onDirtyChange={onDirtyChange}
    />
  )
}
