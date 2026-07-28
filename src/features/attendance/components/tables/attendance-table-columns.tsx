"use client"

import type { ColumnConfig } from "@/components/shared/table/dynamic-table"
import type { ShiftAttendance } from "@/features/attendance/types/attendance-types"
import { Badge } from "@/components/ui/badge"

function formatTime(value: Date | string | null | undefined): string {
  if (!value) return "—"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null) return "—"
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  return `${hours}h ${mins}m`
}

export const attendanceTableColumns: ColumnConfig[] = [
  {
    key: "userName",
    label: "Employee",
    type: "string",
    sortable: true,
  },
  {
    key: "locationName",
    label: "Location",
    type: "string",
    sortable: true,
  },
  {
    key: "arrivedAt",
    label: "Arrived",
    type: "date",
    sortable: true,
    format: (value) => formatTime(value as Date | string | null),
  },
  {
    key: "leftAt",
    label: "Left",
    type: "date",
    sortable: true,
    format: (value) => formatTime(value as Date | string | null),
  },
  {
    key: "durationLabel",
    label: "On the job",
    type: "string",
    sortable: true,
  },
  {
    key: "status",
    label: "Status",
    type: "string",
    sortable: true,
    format: (value) => (
      <Badge variant={value === "On site" ? "default" : "outline"}>
        {String(value ?? "")}
      </Badge>
    ),
  },
]

export function toAttendanceTableRow(
  attendance: ShiftAttendance,
): Record<string, unknown> {
  const minutes = attendance.isOpen
    ? attendance.elapsedMinutes
    : attendance.durationMinutes

  return {
    id: attendance.id,
    userName: attendance.userName ?? "",
    locationName: attendance.locationName ?? "—",
    arrivedAt: attendance.checkInAt,
    leftAt: attendance.checkOutAt,
    durationMinutes: minutes,
    durationLabel: attendance.isOpen
      ? `${formatDuration(minutes)} (live)`
      : formatDuration(minutes),
    status: attendance.isOpen ? "On site" : "Completed",
    checkInActivityId: attendance.checkInActivityId,
    checkOutActivityId: attendance.checkOutActivityId,
  }
}
