import type {
  ShiftStatus as PrismaShiftStatus,
  ShiftType as PrismaShiftType,
} from "@/generated/prisma/client"

export type ShiftType = PrismaShiftType
export type ShiftStatus = PrismaShiftStatus

/** Public shift template returned by server actions. */
export type ShiftTemplate = {
  id: string
  locationId: string
  locationName: string | null
  userId: string
  userName: string | null
  type: ShiftType
  startTime: string
  endTime: string
  weekdays: number[]
  notes: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

/** Form values for create / update template. Weekdays are string option values. */
export type ShiftTemplateFormValues = {
  locationId: string
  userId: string
  type: ShiftType
  startTime: string
  endTime: string
  weekdays: string[]
  notes?: string
  isActive?: boolean
}

export type GenerateShiftFormValues = {
  from: Date
  to: Date
}

/** Public shift instance returned by server actions. */
export type ShiftInstance = {
  id: string
  templateId: string | null
  locationId: string
  locationName: string | null
  userId: string
  userName: string | null
  date: string
  type: ShiftType
  startTime: string
  endTime: string
  status: ShiftStatus
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

/** Form values for one-off calendar assign. */
export type ShiftInstanceFormValues = {
  locationId: string
  userId: string
  date: Date
  type: ShiftType
  startTime: string
  endTime: string
  status?: ShiftStatus
  notes?: string
}

/** Calendar presentation shape (adapted from shift-calendar demo). */
export type CalendarShift = {
  id: string
  employeeId: string
  employeeName: string
  date: string
  type: ShiftType
  startTime: string
  endTime: string
  status: ShiftStatus
}

export type CalendarEmployee = {
  id: string
  name: string
  email: string
  department: string
}

export const SHIFT_TYPE_META: Record<
  ShiftType,
  { label: string; color: string; time: string }
> = {
  MORNING: { label: "Morning", color: "bg-blue-500", time: "06:00-14:00" },
  AFTERNOON: { label: "Afternoon", color: "bg-amber-500", time: "14:00-22:00" },
  NIGHT: { label: "Night", color: "bg-slate-700", time: "22:00-06:00" },
  FULL_DAY: { label: "Full Day", color: "bg-green-500", time: "08:00-17:00" },
}

/** @deprecated Prefer SHIFT_TYPE_META — kept for calendar re-exports. */
export const SHIFT_TYPES = SHIFT_TYPE_META

export const WEEKDAY_LABELS: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
}

export type ManagedLocation = {
  id: string
  name: string
}
