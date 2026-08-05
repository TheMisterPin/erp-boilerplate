"use client"

import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ShiftCard } from "@/features/shifts/components/shift-calendar/shift-card"
import type { CalendarShift } from "@/features/shifts/types/shift-types"

type ShiftGridProps = {
  shifts: CalendarShift[]
  currentDate: Date
  viewMode: "month" | "week"
  onDateClick?: (date: string) => void
  onShiftDelete?: (shiftId: string) => void
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

function getFirstDayOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
}

function getWeekDates(date: Date): Date[] {
  const curr = new Date(date)
  const first = curr.getDate() - curr.getDay()
  const weekDates: Date[] = []
  for (let i = 0; i < 7; i++) {
    weekDates.push(new Date(curr.getFullYear(), curr.getMonth(), first + i))
  }
  return weekDates
}

export function ShiftGrid({
  shifts,
  currentDate,
  viewMode,
  onDateClick,
  onShiftDelete,
}: ShiftGridProps) {
  const getShiftsForDate = (dateStr: string) =>
    shifts.filter((shift) => shift.date === dateStr)

  if (viewMode === "week") {
    return (
      <WeekView
        currentDate={currentDate}
        getShiftsForDate={getShiftsForDate}
        onDateClick={onDateClick}
        onShiftDelete={onShiftDelete}
      />
    )
  }

  return (
    <MonthView
      currentDate={currentDate}
      getShiftsForDate={getShiftsForDate}
      onDateClick={onDateClick}
      onShiftDelete={onShiftDelete}
    />
  )
}

type DayViewProps = {
  currentDate: Date
  getShiftsForDate: (dateStr: string) => CalendarShift[]
  onDateClick?: (date: string) => void
  onShiftDelete?: (shiftId: string) => void
}

function MonthView({
  currentDate,
  getShiftsForDate,
  onDateClick,
  onShiftDelete,
}: DayViewProps) {
  const daysInMonth = getDaysInMonth(currentDate)
  const firstDay = getFirstDayOfMonth(currentDate)
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const previousMonthDays = Array.from({ length: firstDay }, (_, i) => {
    const prevMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      1,
    )
    return getDaysInMonth(prevMonth) - firstDay + i + 1
  })

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-sm font-semibold text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid auto-rows-max grid-cols-7 gap-2">
        {previousMonthDays.map((day) => (
          <div
            key={`prev-${day}`}
            className="min-h-24 rounded-lg bg-muted/30 p-2 text-xs text-muted-foreground"
          >
            <div className="font-medium opacity-50">{day}</div>
          </div>
        ))}

        {daysArray.map((day) => {
          const date = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            day,
          )
          const dateStr = formatDate(date)
          const dayShifts = getShiftsForDate(dateStr)
          const isToday = new Date().toDateString() === date.toDateString()

          return (
            <div
              key={day}
              role={onDateClick ? "button" : undefined}
              tabIndex={onDateClick ? 0 : undefined}
              onClick={() => onDateClick?.(dateStr)}
              onKeyDown={(event) => {
                if (!onDateClick) return
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  onDateClick(dateStr)
                }
              }}
              className={`min-h-24 rounded-lg border-2 p-2 transition-colors ${
                onDateClick ? "cursor-pointer" : ""
              } ${
                isToday
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              <div
                className={`mb-1 text-sm font-semibold ${
                  isToday ? "text-primary" : "text-foreground"
                }`}
              >
                {day}
              </div>
              <div className="flex-1 space-y-1">
                {dayShifts.slice(0, 2).map((shift) => (
                  <div key={shift.id} className="group relative">
                    <ShiftCard shift={shift} compact />
                    {onShiftDelete ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute -right-2 -top-2 h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(event) => {
                          event.stopPropagation()
                          onShiftDelete(shift.id)
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    ) : null}
                  </div>
                ))}
                {dayShifts.length > 2 ? (
                  <div className="text-xs font-medium text-muted-foreground">
                    +{dayShifts.length - 2} more
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeekView({
  currentDate,
  getShiftsForDate,
  onDateClick,
  onShiftDelete,
}: DayViewProps) {
  const weekDates = getWeekDates(currentDate)
  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="space-y-4 overflow-x-auto">
      <div className="sticky top-0 grid grid-cols-[60px_repeat(7,1fr)] gap-2 border-b border-border bg-background pb-2">
        <div className="py-2 text-xs font-semibold text-muted-foreground">
          Time
        </div>
        {weekDates.map((date) => {
          const dateStr = formatDate(date)
          const isToday = new Date().toDateString() === date.toDateString()
          return (
            <div
              key={dateStr}
              className={`rounded-lg py-2 text-center ${
                isToday ? "bg-primary/10" : ""
              }`}
            >
              <div className="text-xs font-semibold text-muted-foreground">
                {date.toLocaleDateString("en-US", { weekday: "short" })}
              </div>
              <div
                className={`text-lg font-bold ${
                  isToday ? "text-primary" : "text-foreground"
                }`}
              >
                {date.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-2">
        {hours.map((hour) => (
          <div key={`row-${hour}`} className="contents">
            <div className="py-2 text-center text-xs font-semibold text-muted-foreground">
              {String(hour).padStart(2, "0")}:00
            </div>
            {weekDates.map((date) => {
              const dateStr = formatDate(date)
              const dayShifts = getShiftsForDate(dateStr)

              return (
                <div
                  key={`${dateStr}-${hour}`}
                  role={onDateClick ? "button" : undefined}
                  tabIndex={onDateClick ? 0 : undefined}
                  onClick={() => onDateClick?.(dateStr)}
                  onKeyDown={(event) => {
                    if (!onDateClick) return
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      onDateClick(dateStr)
                    }
                  }}
                  className={`min-h-12 rounded-lg border border-border bg-muted/30 p-1 transition-colors hover:bg-muted/50 ${
                    onDateClick ? "cursor-pointer" : ""
                  }`}
                >
                  {dayShifts.map((shift) => {
                    const startHour = Number.parseInt(
                      shift.startTime.split(":")[0] ?? "0",
                      10,
                    )
                    if (startHour !== hour) return null
                    return (
                      <div key={shift.id} className="group relative">
                        <ShiftCard shift={shift} compact />
                        {onShiftDelete ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute -right-2 -top-2 h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={(event) => {
                              event.stopPropagation()
                              onShiftDelete(shift.id)
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
