/** Calendar windows for the command center.

Shift rows store a calendar date as UTC midnight (`parseDateOnly`).
Attendance timestamps are real instants, so they stay on the local clock.
*/

export function startOfDay(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

export function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

/** Local calendar day stored as UTC midnight, matching shift and time-off dates. */
export function parseDateOnly(value: Date): Date {
  return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()))
}

/** Monday of the week containing `d`, in local time. */
export function startOfWeekMonday(d: Date): Date {
  const start = startOfDay(d)
  return addDays(start, -((start.getDay() + 6) % 7))
}

export function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`
}

/** Key for a UTC date-only value such as `ShiftInstance.date`. */
export function shiftDayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export type DashboardWindow = {
  attendanceSince: Date
  todayLocalStart: Date
  instanceFrom: Date
  instanceTo: Date
  weekStart: Date
  weekEnd: Date
  last7LocalKeys: string[]
  last7ShiftKeys: string[]
  weekShiftKeys: string[]
}

export function dashboardWindow(now = new Date()): DashboardWindow {
  const todayLocalStart = startOfDay(now)
  const todayUtc = parseDateOnly(now)
  const attendanceSince = addDays(todayLocalStart, -6)
  const weekStart = parseDateOnly(startOfWeekMonday(now))
  const weekEnd = addUtcDays(weekStart, 7)
  const shiftSince = addUtcDays(todayUtc, -6)
  const instanceFrom = shiftSince < weekStart ? shiftSince : weekStart
  const endOfToday = addUtcDays(todayUtc, 1)

  return {
    attendanceSince,
    todayLocalStart,
    instanceFrom,
    instanceTo: weekEnd > endOfToday ? weekEnd : endOfToday,
    weekStart,
    weekEnd,
    last7LocalKeys: Array.from({ length: 7 }, (_, i) =>
      localDayKey(addDays(todayLocalStart, i - 6)),
    ),
    last7ShiftKeys: Array.from({ length: 7 }, (_, i) =>
      shiftDayKey(addUtcDays(todayUtc, i - 6)),
    ),
    weekShiftKeys: Array.from({ length: 7 }, (_, i) =>
      shiftDayKey(addUtcDays(weekStart, i)),
    ),
  }
}
