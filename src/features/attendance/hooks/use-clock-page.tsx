"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { useAuth } from "@/features/auth/hooks/use-auth"
import { loginAction, logoutAction } from "@/features/auth/actions/auth-actions"
import { useError } from "@/features/errors"
import {
  checkIn,
  checkOut,
  getClockStatus,
  listAttendances,
} from "@/features/attendance/actions/attendance-actions"
import { toAttendanceTableRow } from "@/features/attendance/components/tables/attendance-table-columns"
import type { ClockPageProps } from "@/features/attendance/components/pages/clock-page"
import type {
  ClockStatus,
  ShiftAttendance,
} from "@/features/attendance/types/attendance-types"

/** Kiosk clock page logic — login, punch, attendance table. */
export function useClockPage(): ClockPageProps {
  const { run } = useError()
  const { me, status, refreshMe } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loggingIn, setLoggingIn] = useState(false)
  const [punching, setPunching] = useState(false)
  const [clock, setClock] = useState<ClockStatus | null>(null)
  const [attendances, setAttendances] = useState<ShiftAttendance[]>([])
  const [loaded, setLoaded] = useState(false)

  const isAuthenticated = status === "authenticated" && !!me

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setClock(null)
      setAttendances([])
      setLoaded(true)
      return
    }

    const [statusData, list] = await Promise.all([
      run(getClockStatus()),
      run(listAttendances()),
    ])
    setClock(statusData ?? null)
    setAttendances(list ?? [])
    setLoaded(true)
  }, [isAuthenticated, run])

  useEffect(() => {
    if (status === "loading") return
    let cancelled = false
    void (async () => {
      if (status !== "authenticated") {
        if (!cancelled) {
          setClock(null)
          setAttendances([])
          setLoaded(true)
        }
        return
      }
      const [statusData, list] = await Promise.all([
        run(getClockStatus()),
        run(listAttendances()),
      ])
      if (cancelled) return
      setClock(statusData ?? null)
      setAttendances(list ?? [])
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
      setAttendances((prev) =>
        prev.map((row) =>
          row.isOpen
            ? {
                ...row,
                elapsedMinutes: Math.max(
                  0,
                  Math.floor(
                    (Date.now() - new Date(row.checkInAt).getTime()) / 60_000,
                  ),
                ),
              }
            : row,
        ),
      )
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

  const rows = useMemo(
    () => attendances.map(toAttendanceTableRow),
    [attendances],
  )

  const onLogin = useCallback(async () => {
    setLoggingIn(true)
    try {
      const user = await run(loginAction({ email, password }))
      if (user) {
        await refreshMe()
        toast.success(`Welcome, ${user.fullName}`)
        setPassword("")
        setLoaded(false)
        const [statusData, list] = await Promise.all([
          run(getClockStatus()),
          run(listAttendances()),
        ])
        setClock(statusData ?? null)
        setAttendances(list ?? [])
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
      setAttendances([])
      setEmail("")
      setPassword("")
      toast.success("Signed out — ready for the next employee")
    }
  }, [refreshMe, run])

  const onCheckIn = useCallback(async () => {
    setPunching(true)
    try {
      const data = await run(checkIn())
      if (data) {
        toast.success("Checked in")
        await load()
      }
    } finally {
      setPunching(false)
    }
  }, [load, run])

  const onCheckOut = useCallback(async () => {
    setPunching(true)
    try {
      const data = await run(checkOut())
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
    rows,
    setEmail,
    setPassword,
    onLogin,
    onLogout,
    onCheckIn,
    onCheckOut,
  }
}
