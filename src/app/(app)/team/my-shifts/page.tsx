"use client"

import { ShiftSchedulePage } from "@/features/shifts/components/pages/shift-schedule-page"
import { useShiftSchedulePage } from "@/features/shifts/hooks/use-shift-schedule-page"

export default function MyShiftsPage() {
  const page = useShiftSchedulePage()

  return (
    <div className="h-full min-h-0 overflow-y-auto p-8">
      <div className="mx-auto w-full max-w-7xl">
        <ShiftSchedulePage {...page} />
      </div>
    </div>
  )
}
