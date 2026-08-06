"use client"

import type { ColumnConfig } from "@/components/shared/table/dynamic-table"
import { Badge } from "@/components/ui/badge"
import type {
  TimeOffRequest,
  TimeOffStatus,
  TimeOffType,
} from "@/features/time-off/types/time-off-types"

const TYPE_LABELS: Record<TimeOffType, string> = {
  TIME_OFF: "Time off",
  SICK: "Sick",
}

const STATUS_LABELS: Record<TimeOffStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
}

function formatDateOnly(value: unknown): string {
  const [year, month, day] = String(value ?? "")
    .split("-")
    .map(Number)
  if (!year || !month || !day) return "—"
  return new Date(year, month - 1, day).toLocaleDateString()
}

function formatStatus(value: unknown) {
  const status = value as TimeOffStatus
  const variant =
    status === "APPROVED"
      ? "success"
      : status === "PENDING"
        ? "warning"
        : status === "REJECTED"
          ? "error"
          : "neutral"

  return <Badge variant={variant}>{STATUS_LABELS[status] ?? String(value)}</Badge>
}

export const timeOffTableColumns: ColumnConfig[] = [
  {
    key: "userName",
    label: "Employee",
    type: "string",
    sortable: true,
  },
  {
    key: "type",
    label: "Type",
    type: "string",
    sortable: true,
    format: (value) => (
      <Badge variant="secondary">
        {TYPE_LABELS[value as TimeOffType] ?? String(value)}
      </Badge>
    ),
  },
  {
    key: "startDate",
    label: "Start",
    type: "date",
    sortable: true,
    format: formatDateOnly,
  },
  {
    key: "endDate",
    label: "End",
    type: "date",
    sortable: true,
    format: formatDateOnly,
  },
  {
    key: "status",
    label: "Status",
    type: "string",
    sortable: true,
    format: formatStatus,
  },
  {
    key: "note",
    label: "Note",
    type: "string",
    sortable: false,
  },
  {
    key: "reviewNote",
    label: "Review note",
    type: "string",
    sortable: false,
  },
]

export function toTimeOffTableRow(
  request: TimeOffRequest,
): Record<string, unknown> {
  return {
    id: request.id,
    userName: request.userName ?? "—",
    type: request.type,
    startDate: request.startDate,
    endDate: request.endDate,
    status: request.status,
    note: request.note ?? "—",
    reviewNote: request.reviewNote ?? "—",
    canReview: request.canReview,
  }
}
