export type ShiftAttendance = {
  id: string
  userId: string
  userName: string | null
  shiftInstanceId: string | null
  locationId: string | null
  locationName: string | null
  checkInAt: Date
  checkOutAt: Date | null
  /** Minutes on the job; null while still checked in. */
  durationMinutes: number | null
  /** Live elapsed minutes when still open (client may also compute). */
  elapsedMinutes: number | null
  checkInActivityId: string | null
  checkOutActivityId: string | null
  isOpen: boolean
}

export type ClockStatus = {
  me: {
    id: string
    fullName: string
    email: string
    role: string
  }
  openAttendance: ShiftAttendance | null
  todayShift: {
    id: string
    type: string
    startTime: string
    endTime: string
    locationName: string | null
  } | null
}
