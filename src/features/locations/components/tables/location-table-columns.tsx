"use client"

import { Badge } from "@/components/ui/badge"
import type { ColumnConfig } from "@/components/shared/table/dynamic-table"
import type { Location } from "@/features/locations/types/location-types"

/** Column config for Location rows in DynamicTable. */
export const locationTableColumns: ColumnConfig[] = [
  {
    key: "name",
    label: "Name",
    type: "string",
    sortable: true,
  },
  {
    key: "managerName",
    label: "Manager",
    type: "string",
    sortable: true,
    format: (value) =>
      value ? (
        String(value)
      ) : (
        <span className="text-muted-foreground">Unassigned</span>
      ),
  },
  {
    key: "staffCount",
    label: "Staff",
    type: "number",
    sortable: true,
  },
  {
    key: "minimumStaff",
    label: "Min staff",
    type: "number",
    sortable: true,
  },
  {
    key: "description",
    label: "Description",
    type: "string",
    sortable: true,
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

/** Flatten Location into a plain row DynamicTable can index. */
export function toLocationTableRow(
  location: Location,
): Record<string, unknown> {
  return {
    id: location.id,
    name: location.name,
    description: location.description ?? null,
    managerId: location.managerId ?? null,
    managerName: location.managerName ?? null,
    minimumStaff: location.minimumStaff,
    staffCount: location.staffCount,
    isActive: location.isActive,
    createdAt: location.createdAt ?? null,
    updatedAt: location.updatedAt ?? null,
  }
}
