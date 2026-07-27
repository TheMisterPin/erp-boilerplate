"use client"

import { useEffect, useMemo, useState } from "react"
import type { UseFormReturn } from "react-hook-form"

import { DynamicForm } from "@/components/shared/forms/templates"
import { LayoutMode } from "@/components/shared/forms/types"
import { useError } from "@/features/errors"
import { listManagedLocations } from "@/features/locations/actions/location-actions"
import {
  buildAssignLocationFormFields,
  type SelectOption,
} from "@/features/users/components/forms/assign-location-form-fields"
import type { AssignLocationFormValues } from "@/features/users/types/user-types"

type AssignLocationFormProps = {
  initialValues?: Partial<AssignLocationFormValues>
  onSubmit: (
    values: AssignLocationFormValues,
    form: UseFormReturn<AssignLocationFormValues>,
  ) => void | Promise<void>
  onDirtyChange?: (isDirty: boolean) => void
}

export function AssignLocationForm({
  initialValues,
  onSubmit,
  onDirtyChange,
}: AssignLocationFormProps) {
  const { run } = useError()
  const [locationOptions, setLocationOptions] = useState<SelectOption[]>([])
  const [optionsLoaded, setOptionsLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const locations = await run(listManagedLocations())
      if (cancelled) return
      setLocationOptions(
        (locations ?? []).map((location) => ({
          label: location.name,
          value: location.id,
        })),
      )
      setOptionsLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [run])

  const fields = useMemo(
    () => buildAssignLocationFormFields(locationOptions),
    [locationOptions],
  )

  if (!optionsLoaded) {
    return (
      <p className="text-sm text-muted-foreground">Loading locations…</p>
    )
  }

  return (
    <DynamicForm<AssignLocationFormValues>
      fields={fields}
      layout={{ mode: LayoutMode.Single, columns: 1 }}
      initialValues={initialValues}
      onSubmit={onSubmit}
      submitLabel="Assign location"
      onDirtyChange={onDirtyChange}
    />
  )
}
