"use client"

import { Badge } from "@/components/ui/badge"
import type { ColumnConfig } from "@/components/shared/table/dynamic-table"
import type { ShiftTemplate } from "@/features/shifts/types/shift-types"
import { SHIFT_TYPE_META, WEEKDAY_LABELS } from "@/features/shifts/types/shift-types"

function formatWeekdays(weekdays: number[]): string {
  return weekdays
    .slice()
    .sort((a, b) => a - b)
    .map((day) => WEEKDAY_LABELS[day] ?? String(day))
    .join(", ")
}

/** Column config for ShiftTemplate rows in DynamicTable. */
export const shiftTemplateTableColumns: ColumnConfig[] = [
  {
    key: "userName",
    label: "Assignee",
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
    key: "typeLabel",
    label: "Type",
    type: "string",
    sortable: true,
    format: (value) => (
      <Badge variant="secondary">{String(value ?? "")}</Badge>
    ),
  },
  {
    key: "timeRange",
    label: "Time",
    type: "string",
    sortable: true,
  },
  {
    key: "weekdaysLabel",
    label: "Weekdays",
    type: "string",
    sortable: false,
  },
  {
    key: "isActive",
    label: "Status",
    type: "boolean",
    sortable: true,
    format: (value) => (
      <Badge variant={value ? "default" : "outline"}>
        {value ? "Active" : "Inactive"}
      </Badge>
    ),
  },
]

/** Flatten ShiftTemplate into a plain row DynamicTable can index. */
export function toShiftTemplateTableRow(
  template: ShiftTemplate,
): Record<string, unknown> {
  return {
    id: template.id,
    userName: template.userName ?? "",
    locationName: template.locationName ?? "",
    type: template.type,
    typeLabel: SHIFT_TYPE_META[template.type].label,
    timeRange: `${template.startTime}–${template.endTime}`,
    weekdaysLabel: formatWeekdays(template.weekdays),
    isActive: template.isActive,
    notes: template.notes ?? null,
    createdAt: template.createdAt ?? null,
  }
}
