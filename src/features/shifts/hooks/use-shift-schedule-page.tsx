"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import type { UseFormReturn } from "react-hook-form"

import { useModal } from "@/components/shared/modals"
import { Actions, can } from "@/features/auth/permissions"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useError } from "@/features/errors"
import {
  createShiftInstance,
  deleteShiftInstance,
  listShiftInstances,
} from "@/features/shifts/actions/shift-instance-actions"
import { listManagedLocations } from "@/features/shifts/actions/shift-template-actions"
import { ShiftInstanceForm } from "@/features/shifts/components/forms/shift-instance-form"
import type { ShiftSchedulePageProps } from "@/features/shifts/components/pages/shift-schedule-page"
import type {
  CalendarShift,
  ShiftInstance,
  ShiftInstanceFormValues,
} from "@/features/shifts/types/shift-types"

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function toCalendarShift(instance: ShiftInstance): CalendarShift {
  return {
    id: instance.id,
    employeeId: instance.userId,
    employeeName: instance.userName ?? "Unknown",
    date: instance.date,
    type: instance.type,
    startTime: instance.startTime,
    endTime: instance.endTime,
    status: instance.status,
  }
}

/** Page logic for my-shifts calendar — inject into `ShiftSchedulePage`. */
export function useShiftSchedulePage(): ShiftSchedulePageProps {
  const { run } = useError()
  const { me } = useAuth()
  const { openModal, closeModal, setDirty, confirm } = useModal()
  const [instances, setInstances] = useState<ShiftInstance[]>([])
  const [managedCount, setManagedCount] = useState(0)
  const [loaded, setLoaded] = useState(false)

  const canWrite =
    !!me &&
    (can(me.role, Actions.shifts.write) || managedCount > 0)

  const load = useCallback(async () => {
    const [data, managed] = await Promise.all([
      run(listShiftInstances()),
      run(listManagedLocations()),
    ])
    setInstances(data ?? [])
    setManagedCount((managed ?? []).length)
    setLoaded(true)
  }, [run])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [data, managed] = await Promise.all([
        run(listShiftInstances()),
        run(listManagedLocations()),
      ])
      if (cancelled) return
      setInstances(data ?? [])
      setManagedCount((managed ?? []).length)
      setLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [run])

  const shifts = useMemo(
    () => instances.map(toCalendarShift),
    [instances],
  )

  const onAssignRequest = useCallback(
    (date: string | null) => {
      const initialDate = date ? parseLocalDate(date) : new Date()
      let formId = ""
      formId = openModal({
        type: "form",
        title: "Assign shift",
        size: "lg",
        component: (
          <ShiftInstanceForm
            initialValues={{
              date: initialDate,
              type: "MORNING",
              startTime: "06:00",
              endTime: "14:00",
              status: "SCHEDULED",
            }}
            onDirtyChange={(isDirty) => setDirty(formId, isDirty)}
            onSubmit={async (
              values: ShiftInstanceFormValues,
              form: UseFormReturn<ShiftInstanceFormValues>,
            ) => {
              const data = await run(createShiftInstance(values), { form })
              if (data) {
                toast.success("Shift assigned")
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

  const onShiftDelete = useCallback(
    async (shiftId: string) => {
      const instance = instances.find((item) => item.id === shiftId)
      const ok = await confirm({
        title: "Delete this shift?",
        message: instance
          ? `${instance.userName ?? "This shift"} on ${instance.date} will be removed.`
          : "This shift will be soft-deleted.",
        variant: "destructive",
        confirmLabel: "Delete",
      })
      if (!ok) return
      const result = await run(deleteShiftInstance(shiftId))
      if (result) {
        toast.success("Shift deleted")
        await load()
      }
    },
    [confirm, instances, load, run],
  )

  return {
    loaded,
    shifts,
    canWrite,
    onAssignRequest,
    onShiftDelete,
  }
}
