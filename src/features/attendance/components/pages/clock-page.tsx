"use client"

import { LogIn, LogOut, Timer } from "lucide-react"

import {
  DataTableFrame,
  DynamicTable,
} from "@/components/shared/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { attendanceTableColumns } from "@/features/attendance/components/tables/attendance-table-columns"
import type { ClockStatus } from "@/features/attendance/types/attendance-types"

export type ClockPageProps = {
  authLoading: boolean
  loaded: boolean
  isAuthenticated: boolean
  email: string
  password: string
  loggingIn: boolean
  punching: boolean
  clock: ClockStatus | null
  rows: Record<string, unknown>[]
  setEmail: (value: string) => void
  setPassword: (value: string) => void
  onLogin: () => void | Promise<void>
  onLogout: () => void | Promise<void>
  onCheckIn: () => void | Promise<void>
  onCheckOut: () => void | Promise<void>
}

function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null) return "—"
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  return `${hours}h ${mins}m`
}

/** Stateless kiosk clock view — state from `useClockPage`. */
export function ClockPage({
  authLoading,
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
}: ClockPageProps) {
  if (authLoading) {
    return (
      <div className="mx-auto flex w-full max-w-lg px-4 py-16 text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-16">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Timer className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Time clock</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with your work email to check in or out for your shift.
          </p>
        </div>
        <form
          className="flex flex-col gap-4 rounded-xl border bg-card p-6"
          onSubmit={(event) => {
            event.preventDefault()
            void onLogin()
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="clock-email">Email</Label>
            <Input
              id="clock-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clock-password">Password</Label>
            <Input
              id="clock-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <Button type="submit" size="lg" disabled={loggingIn}>
            {loggingIn ? "Signing in…" : "Sign in to clock"}
          </Button>
        </form>
      </div>
    )
  }

  const isCheckedIn = !!clock?.openAttendance

  return (
    <div className="mx-auto flex h-svh min-h-0 w-full max-w-5xl flex-col gap-6 overflow-hidden px-4 py-10">
      <header className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Time clock</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as{" "}
            <span className="font-medium text-foreground">
              {clock?.me.fullName ?? "…"}
            </span>
          </p>
          {clock?.todayShift ? (
            <p className="text-sm text-muted-foreground">
              Today’s shift: {clock.todayShift.type.replaceAll("_", " ")}{" "}
              {clock.todayShift.startTime}–{clock.todayShift.endTime}
              {clock.todayShift.locationName
                ? ` · ${clock.todayShift.locationName}`
                : ""}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No scheduled shift for today — you can still check in.
            </p>
          )}
        </div>
        <Button type="button" variant="outline" onClick={() => void onLogout()}>
          Sign out
        </Button>
      </header>

      <section className="shrink-0 rounded-xl border bg-card p-6">
        <div className="flex flex-col items-center gap-6 text-center">
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-full ${
              isCheckedIn
                ? "bg-success-surface text-success-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {isCheckedIn ? (
              <LogOut className="h-9 w-9" />
            ) : (
              <LogIn className="h-9 w-9" />
            )}
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold">
              {isCheckedIn ? "You are on the clock" : "You are checked out"}
            </p>
            {isCheckedIn && clock.openAttendance ? (
              <p className="text-sm text-muted-foreground">
                Arrived{" "}
                {new Date(clock.openAttendance.checkInAt).toLocaleTimeString(
                  undefined,
                  { hour: "2-digit", minute: "2-digit" },
                )}{" "}
                · {formatDuration(clock.openAttendance.elapsedMinutes)} so far
              </p>
            ) : null}
          </div>
          {isCheckedIn ? (
            <Button
              type="button"
              size="lg"
              variant="destructive"
              className="min-w-48"
              disabled={punching || !loaded}
              onClick={() => void onCheckOut()}
            >
              {punching ? "Checking out…" : "Check out"}
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              className="min-w-48"
              disabled={punching || !loaded}
              onClick={() => void onCheckIn()}
            >
              {punching ? "Checking in…" : "Check in"}
            </Button>
          )}
        </div>
      </section>

      <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        <div className="shrink-0">
          <h2 className="text-lg font-semibold tracking-tight">
            Attendance log
          </h2>
          <p className="text-sm text-muted-foreground">
            Arrival, departure, and time on the job. Linked to activity log
            events.
          </p>
        </div>
        {!loaded ? (
          <DataTableFrame>
            <p className="text-sm text-muted-foreground">Loading attendance…</p>
          </DataTableFrame>
        ) : rows.length === 0 ? (
          <DataTableFrame>
            <p className="text-sm text-muted-foreground">No check-ins yet.</p>
          </DataTableFrame>
        ) : (
          <div className="min-h-0 flex-1 overflow-hidden rounded-lg border">
            <DynamicTable
              data={rows}
              columns={attendanceTableColumns}
              pageSize={10}
              searchable
              sortable
              filterable
            />
          </div>
        )}
      </section>
    </div>
  )
}
