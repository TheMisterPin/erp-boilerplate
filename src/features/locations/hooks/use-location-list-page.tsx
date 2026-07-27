"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import type { UseFormReturn } from "react-hook-form"

import { applyServerErrors } from "@/components/shared/forms/lib/apply-server-errors"
import { useModal } from "@/components/shared/modals"
import { Actions, can } from "@/features/auth/permissions"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useError } from "@/features/errors"
import {
  createLocation,
  deleteLocation,
  listLocations,
  updateLocation,
} from "@/features/locations/actions/location-actions"
import { LocationForm } from "@/features/locations/components/forms/location-form"
import type { LocationListPageProps } from "@/features/locations/components/pages/location-list-page"
import { toLocationTableRow } from "@/features/locations/components/tables/location-table-columns"
import type {
  Location,
  LocationFormValues,
} from "@/features/locations/types/location-types"

function toLocationFormValues(location: Location): Partial<LocationFormValues> {
  return {
    name: location.name,
    description: location.description ?? "",
    managerId: location.managerId ?? "",
    minimumStaff: location.minimumStaff,
    isActive: location.isActive,
  }
}

/** Page logic for locations list — inject into `LocationListPage`. */
export function useLocationListPage(): LocationListPageProps {
  const { run } = useError()
  const { me } = useAuth()
  const { openModal, closeModal, setDirty, confirm } = useModal()
  const [locations, setLocations] = useState<Location[]>([])
  const [loaded, setLoaded] = useState(false)

  const canWrite = me ? can(me.role, Actions.locations.write) : false

  const load = useCallback(async () => {
    const data = await run(listLocations())
    setLocations(data ?? [])
    setLoaded(true)
  }, [run])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const data = await run(listLocations())
      if (!cancelled) {
        setLocations(data ?? [])
        setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [run])

  const rows = useMemo(() => locations.map(toLocationTableRow), [locations])

  const onCreate = useCallback(() => {
    let formId = ""
    formId = openModal({
      type: "form",
      title: "New location — assign a manager",
      size: "lg",
      component: (
        <LocationForm
          onDirtyChange={(isDirty) => setDirty(formId, isDirty)}
          onSubmit={async (
            values: LocationFormValues,
            form: UseFormReturn<LocationFormValues>,
          ) => {
            const data = await run(createLocation(values), {
              onFieldErrors: (fe) => applyServerErrors(form, fe),
            })
            if (data) {
              toast.success("Location created")
              closeModal(formId)
              await load()
            }
          }}
        />
      ),
    })
  }, [closeModal, load, openModal, run, setDirty])

  const onEdit = useCallback(
    (location: Location) => {
      let formId = ""
      formId = openModal({
        type: "form",
        title: "Edit location",
        size: "lg",
        component: (
          <LocationForm
            isEdit
            initialValues={toLocationFormValues(location)}
            onDirtyChange={(isDirty) => setDirty(formId, isDirty)}
            onSubmit={async (
              values: LocationFormValues,
              form: UseFormReturn<LocationFormValues>,
            ) => {
              const data = await run(
                updateLocation({ ...values, id: location.id }),
                {
                  onFieldErrors: (fe) => applyServerErrors(form, fe),
                },
              )
              if (data) {
                toast.success("Location saved")
                closeModal(formId)
                await load()
              }
            }}
          />
        ),
      })
    },
    [closeModal, load, openModal, run, setDirty],
  )

  const onDelete = useCallback(
    async (location: Location) => {
      const ok = await confirm({
        title: "Delete this location?",
        message: `${location.name} will be soft-deleted and marked inactive.`,
        variant: "destructive",
        confirmLabel: "Delete",
      })
      if (!ok) return
      const result = await run(deleteLocation(location.id))
      if (result) {
        toast.success("Location deleted")
        await load()
      }
    },
    [confirm, load, run],
  )

  return {
    loaded,
    locations,
    rows,
    canWrite,
    onCreate,
    onEdit,
    onDelete,
  }
}
