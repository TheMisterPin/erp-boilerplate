/** Minutes early (negative) or late (positive) relative to shift start. */
export type CheckInTiming = {
  status: "early" | "on_time" | "late"
  /** Absolute minutes away from start. */
  minutesOff: number
  startTime: string
}

/** Combine local calendar day with `HH:mm` / `HH:mm:ss` shift time. */
export function shiftStartOnDay(day: Date, startTime: string): Date {
  const [hours, minutes] = startTime.split(":").map((part) => Number(part))
  const start = new Date(day)
  start.setHours(hours || 0, minutes || 0, 0, 0)
  return start
}

export function getCheckInTiming(
  startTime: string,
  now: Date = new Date(),
): CheckInTiming {
  const start = shiftStartOnDay(now, startTime)
  const deltaMinutes = Math.round((now.getTime() - start.getTime()) / 60_000)

  if (deltaMinutes < 0) {
    return {
      status: "early",
      minutesOff: Math.abs(deltaMinutes),
      startTime,
    }
  }
  if (deltaMinutes > 0) {
    return {
      status: "late",
      minutesOff: deltaMinutes,
      startTime,
    }
  }
  return { status: "on_time", minutesOff: 0, startTime }
}

export function formatMinutesOff(minutes: number): string {
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours} hour${hours === 1 ? "" : "s"}`
  return `${hours}h ${mins}m`
}
