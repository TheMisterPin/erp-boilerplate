"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ShiftGrid } from "@/features/shifts/components/shift-calendar/shift-grid"
import type { CalendarShift } from "@/features/shifts/types/shift-types"

type ShiftCalendarProps = {
  shifts: CalendarShift[]
  canWrite: boolean
  onAssignRequest: (date: string | null) => void
  onShiftDelete?: (shiftId: string) => void
  viewMode?: "month" | "week"
}

export function ShiftCalendar({
  shifts,
  canWrite,
  onAssignRequest,
  onShiftDelete,
  viewMode = "month",
}: ShiftCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [mode, setMode] = useState<"month" | "week">(viewMode)

  const goToPreviousPeriod = () => {
    const next = new Date(currentDate)
    if (mode === "month") {
      next.setMonth(next.getMonth() - 1)
    } else {
      next.setDate(next.getDate() - 7)
    }
    setCurrentDate(next)
  }

  const goToNextPeriod = () => {
    const next = new Date(currentDate)
    if (mode === "month") {
      next.setMonth(next.getMonth() + 1)
    } else {
      next.setDate(next.getDate() + 7)
    }
    setCurrentDate(next)
  }

  const monthYear = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  return (
    <div className="w-full rounded-lg border border-border bg-background shadow-sm">
      <div className="border-b border-border p-4 sm:p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              {monthYear}
            </h2>
            <p className="text-sm text-muted-foreground">
              {canWrite
                ? "Assign and visualize employee shifts"
                : "Your scheduled shifts"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPeriod}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPeriod}
              className="gap-1"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            variant={mode === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("month")}
          >
            Month
          </Button>
          <Button
            variant={mode === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("week")}
          >
            Week
          </Button>
          {canWrite ? (
            <Button
              onClick={() => onAssignRequest(null)}
              size="sm"
              className="ml-auto gap-1"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Assign Shift</span>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <ShiftGrid
          shifts={shifts}
          currentDate={currentDate}
          viewMode={mode}
          onDateClick={canWrite ? onAssignRequest : undefined}
          onShiftDelete={canWrite ? onShiftDelete : undefined}
        />
      </div>
    </div>
  )
}
