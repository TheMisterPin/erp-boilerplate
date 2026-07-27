"use client"

import { SHIFT_TYPE_META } from "@/features/shifts/types/shift-types"
import type { CalendarShift } from "@/features/shifts/types/shift-types"

type ShiftCardProps = {
  shift: CalendarShift
  compact?: boolean
}

export function ShiftCard({ shift, compact = false }: ShiftCardProps) {
  const shiftConfig = SHIFT_TYPE_META[shift.type]

  if (compact) {
    return (
      <div
        className={`${shiftConfig.color} truncate rounded px-2 py-1 text-xs font-medium text-white`}
        title={`${shift.employeeName} - ${shiftConfig.label} (${shift.startTime}-${shift.endTime})`}
      >
        {shift.employeeName}
      </div>
    )
  }

  return (
    <div
      className={`${shiftConfig.color} rounded-lg p-3 text-white shadow-sm transition-shadow hover:shadow-md`}
    >
      <div className="text-sm font-semibold">{shift.employeeName}</div>
      <div className="mt-1 text-xs opacity-90">{shiftConfig.label}</div>
      <div className="mt-1 text-xs opacity-75">
        {shift.startTime} - {shift.endTime}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="opacity-75">{shift.status}</span>
      </div>
    </div>
  )
}
