"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { UseFormReturn } from "react-hook-form"
import { toast } from "sonner"

import { useModal } from "@/components/shared/modals"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useError } from "@/features/errors"
import {
  getProfile,
  updateOwnProfile,
} from "@/features/profile/actions/profile-actions"
import type { ProfilePageProps } from "@/features/profile/components/pages/profile-page"
import type {
  Profile,
  ProfileFormValues,
} from "@/features/profile/types/profile-types"
import { listShiftInstances } from "@/features/shifts/actions/shift-instance-actions"
import type { ShiftInstance } from "@/features/shifts/types/shift-types"
import {
  cancelTimeOffRequest,
  createTimeOffRequest,
  listTimeOffRequests,
} from "@/features/time-off/actions/time-off-actions"
import { TimeOffRequestForm } from "@/features/time-off/components/forms"
import type {
  TimeOffRequest,
  TimeOffRequestFormValues,
  TimeOffType,
} from "@/features/time-off/types/time-off-types"

function formatLocalDateOnly(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/** Page orchestration for the current user's profile hub. */
export function useProfilePage(): ProfilePageProps {
  const { me, refreshMe } = useAuth()
  const { run } = useError()
  const { openModal, closeModal, setDirty, confirm } = useModal()
  const [tab, setTab] = useState("profile")
  const [profile, setProfile] = useState<Profile | null>(null)
  const [shifts, setShifts] = useState<ShiftInstance[]>([])
  const [requests, setRequests] = useState<TimeOffRequest[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!me) return

    let cancelled = false
    void (async () => {
      const [profileData, shiftData, requestData] = await Promise.all([
        run(getProfile()),
        run(listShiftInstances()),
        run(listTimeOffRequests()),
      ])
      if (cancelled) return
      setProfile(profileData)
      setShifts((shiftData ?? []).filter((shift) => shift.userId === me.id))
      setRequests(
        (requestData ?? []).filter((request) => request.userId === me.id),
      )
      setLoaded(true)
    })()

    return () => {
      cancelled = true
    }
  }, [me, run])

  const loadRequests = useCallback(async () => {
    if (!me) return
    const data = await run(listTimeOffRequests())
    setRequests((data ?? []).filter((request) => request.userId === me.id))
  }, [me, run])

  const onSaveProfile = useCallback(
    async (
      values: ProfileFormValues,
      form: UseFormReturn<ProfileFormValues>,
    ) => {
      const saved = await run(updateOwnProfile(values), { form })
      if (!saved) return

      toast.success("Profile saved")
      await refreshMe()
      const reloaded = await run(getProfile())
      setProfile(reloaded ?? saved)
    },
    [refreshMe, run],
  )

  const openRequest = useCallback(
    (lockedType?: TimeOffType) => {
      const today = new Date()
      const initialValues: Partial<TimeOffRequestFormValues> = lockedType
        ? {
            type: lockedType,
            startDate: today,
            endDate: today,
          }
        : { type: "TIME_OFF" }

      let formId = ""
      formId = openModal({
        type: "form",
        title: lockedType === "SICK" ? "Call in sick" : "Request time off",
        size: "lg",
        component: (
          <TimeOffRequestForm
            lockedType={lockedType}
            initialValues={initialValues}
            onDirtyChange={(isDirty) => setDirty(formId, isDirty)}
            onSubmit={async (values, form) => {
              const created = await run(createTimeOffRequest(values), { form })
              if (!created) return

              toast.success(
                lockedType === "SICK"
                  ? "Sick leave requested"
                  : "Time off requested",
              )
              closeModal(formId)
              await loadRequests()
            }}
          />
        ),
      })
    },
    [closeModal, loadRequests, openModal, run, setDirty],
  )

  const onRequestTimeOff = useCallback(() => {
    openRequest()
  }, [openRequest])

  const onCallInSick = useCallback(() => {
    openRequest("SICK")
  }, [openRequest])

  const onCancelRequest = useCallback(
    async (request: TimeOffRequest) => {
      const ok = await confirm({
        title: "Cancel this request?",
        message: "This pending leave request will be marked as cancelled.",
        variant: "destructive",
        confirmLabel: "Cancel request",
      })
      if (!ok) return

      const cancelled = await run(cancelTimeOffRequest(request.id))
      if (!cancelled) return
      toast.success("Leave request cancelled")
      await loadRequests()
    },
    [confirm, loadRequests, run],
  )

  const upcomingShifts = useMemo(() => {
    const today = formatLocalDateOnly(new Date())
    return shifts
      .filter((shift) => shift.status === "SCHEDULED" && shift.date >= today)
      .sort(
        (left, right) =>
          left.date.localeCompare(right.date) ||
          left.startTime.localeCompare(right.startTime),
      )
      .slice(0, 10)
  }, [shifts])

  return {
    loaded,
    tab,
    onTabChange: setTab,
    profile,
    onSaveProfile,
    upcomingShifts,
    ownRequests: requests,
    onRequestTimeOff,
    onCallInSick,
    onCancelRequest,
  }
}
