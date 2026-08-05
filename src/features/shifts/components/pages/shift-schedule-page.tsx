"use client"

import { ShiftScheduleSkeleton } from "@/features/shifts/components/pages/shift-schedule-skeleton"
import { ShiftCalendar } from "@/features/shifts/components/shift-calendar"
import type { CalendarShift } from "@/features/shifts/types/shift-types"
import { SHIFT_TYPE_META } from "@/features/shifts/types/shift-types"

export type ShiftSchedulePageProps = {
  loaded: boolean
  shifts: CalendarShift[]
  canWrite: boolean
  onAssignRequest: (date: string | null) => void
  onShiftDelete: (shiftId: string) => void
}

/** Stateless schedule view — state from `useShiftSchedulePage`. */
export function ShiftSchedulePage({
  loaded,
  shifts,
  canWrite,
  onAssignRequest,
  onShiftDelete,
}: ShiftSchedulePageProps) {
  if (!loaded) {
    return <ShiftScheduleSkeleton />
  }

  return (
    <div className="space-y-6">
      <ShiftCalendar
        shifts={shifts}
        canWrite={canWrite}
        onAssignRequest={onAssignRequest}
        onShiftDelete={onShiftDelete}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          Object.entries(SHIFT_TYPE_META) as [
            keyof typeof SHIFT_TYPE_META,
            (typeof SHIFT_TYPE_META)[keyof typeof SHIFT_TYPE_META],
          ][]
        ).map(([key, meta]) => (
          <div
            key={key}
            className="rounded-lg border border-border bg-muted/30 p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`${meta.color} h-3 w-3 rounded-full`} />
              <div>
                <div className="text-sm font-semibold text-foreground">
                  {meta.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  {meta.time.replace("-", " - ")}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
