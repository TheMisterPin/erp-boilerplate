"use client"

import {
  DataTableFrame,
  DynamicTable,
} from "@/components/shared/table"
import {
  activityTableColumns,
  toActivityTableRow,
} from "@/features/logging/components/tables/activity-table-columns"
import type { UserActivityItem } from "@/features/logging/types/activity-types"

export type ActivityListPageProps = {
  loaded: boolean
  canRead: boolean
  items: UserActivityItem[]
  rows: ReturnType<typeof toActivityTableRow>[]
}

/** Stateless activity list view — state from `useActivityListPage`. */
export function ActivityListPage({
  loaded,
  canRead,
  items,
  rows,
}: ActivityListPageProps) {
  if (!loaded) {
    return (
      <DataTableFrame>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </DataTableFrame>
    )
  }

  if (!canRead) {
    return (
      <DataTableFrame>
        <p className="text-sm text-muted-foreground">
          You do not have permission to view activity logs.
        </p>
      </DataTableFrame>
    )
  }

  if (items.length === 0) {
    return (
      <DataTableFrame>
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      </DataTableFrame>
    )
  }

  return (
    <DynamicTable
      data={rows}
      columns={activityTableColumns}
      searchable
      sortable
      filterable
    />
  )
}
