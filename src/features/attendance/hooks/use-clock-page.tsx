"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { useModal } from "@/components/shared/modals"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { loginAction, logoutAction } from "@/features/auth/actions/auth-actions"
import { useError } from "@/features/errors"
import {
  checkIn,
  checkOut,
  getClockStatus,
} from "@/features/attendance/actions/attendance-actions"
import type { ClockPageProps } from "@/features/attendance/components/pages/clock-page"
import {
  formatMinutesOff,
  getCheckInTiming,
} from "@/features/attendance/lib/check-in-timing"
import type { ClockStatus } from "@/features/attendance/types/attendance-types"

/** Kiosk clock page logic — login, punch, shift timing warnings. */
export function useClockPage(): ClockPageProps {
  const { run } = useError()
  const { confirm, notify } = useModal()
  const { me, status, refreshMe } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loggingIn, setLoggingIn] = useState(false)
  const [punching, setPunching] = useState(false)
  const [clock, setClock] = useState<ClockStatus | null>(null)
  const [loaded, setLoaded] = useState(false)

  const isAuthenticated = status === "authenticated" && !!me

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setClock(null)
      setLoaded(true)
      return
    }

    const statusData = await run(getClockStatus())
    setClock(statusData ?? null)
    setLoaded(true)
  }, [isAuthenticated, run])

  useEffect(() => {
    if (status === "loading") return
    let cancelled = false
    void (async () => {
      if (status !== "authenticated") {
        if (!cancelled) {
          setClock(null)
          setLoaded(true)
        }
        return
      }
      const statusData = await run(getClockStatus())
      if (cancelled) return
      setClock(statusData ?? null)
      setLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [run, status])

  // Refresh live elapsed duration while checked in
  useEffect(() => {
    if (!clock?.openAttendance) return
    const id = window.setInterval(() => {
      setClock((prev) => {
        if (!prev?.openAttendance) return prev
        const open = prev.openAttendance
        return {
          ...prev,
          openAttendance: {
            ...open,
            elapsedMinutes: Math.max(
              0,
              Math.floor(
                (Date.now() - new Date(open.checkInAt).getTime()) / 60_000,
              ),
            ),
          },
        }
      })
    }, 30_000)
    return () => window.clearInterval(id)
  }, [clock?.openAttendance])

  const onLogin = useCallback(async () => {
    setLoggingIn(true)
    try {
      const user = await run(loginAction({ email, password }))
      if (user) {
        await refreshMe()
        toast.success(`Welcome, ${user.fullName}`)
        setPassword("")
        setLoaded(false)
        const statusData = await run(getClockStatus())
        setClock(statusData ?? null)
        setLoaded(true)
      }
    } finally {
      setLoggingIn(false)
    }
  }, [email, password, refreshMe, run])

  const onLogout = useCallback(async () => {
    const ok = await run(logoutAction())
    if (ok) {
      await refreshMe()
      setClock(null)
      setEmail("")
      setPassword("")
      toast.success("Signed out — ready for the next employee")
    }
  }, [refreshMe, run])

  const onCheckIn = useCallback(async () => {
    const shift = clock?.todayShift
    if (!shift) {
      notify({
        variant: "warning",
        title: "No shift assigned",
        message:
          "You have no shift scheduled for today. Ask a manager to assign one before checking in.",
      })
      return
    }

    const timing = getCheckInTiming(shift.startTime)
    if (timing.status === "early") {
      const ok = await confirm({
        title: "Checking in early",
        message: `Your shift starts at ${timing.startTime} (in ${formatMinutesOff(timing.minutesOff)}). Check in early anyway?`,
        confirmLabel: "Check in early",
      })
      if (!ok) return
    } else if (timing.status === "late") {
      const ok = await confirm({
        title: "Checking in late",
        message: `Your shift started at ${timing.startTime} (${formatMinutesOff(timing.minutesOff)} ago). Check in late anyway?`,
        confirmLabel: "Check in late",
      })
      if (!ok) return
    }

    setPunching(true)
    try {
      const data = await run(checkIn(), {
        overrides: { conflict: "modal" },
      })
      if (data) {
        toast.success("Checked in")
        await load()
      }
    } finally {
      setPunching(false)
    }
  }, [clock?.todayShift, confirm, load, notify, run])

  const onCheckOut = useCallback(async () => {
    setPunching(true)
    try {
      const data = await run(checkOut(), {
        overrides: { conflict: "modal" },
      })
      if (data) {
        toast.success(
          data.durationMinutes != null
            ? `Checked out — ${Math.floor(data.durationMinutes / 60)}h ${data.durationMinutes % 60}m on the job`
            : "Checked out",
        )
        await load()
      }
    } finally {
      setPunching(false)
    }
  }, [load, run])

  return {
    authLoading: status === "loading",
    loaded,
    isAuthenticated,
    email,
    password,
    loggingIn,
    punching,
    clock,
    setEmail,
    setPassword,
    onLogin,
    onLogout,
    onCheckIn,
    onCheckOut,
  }
}
