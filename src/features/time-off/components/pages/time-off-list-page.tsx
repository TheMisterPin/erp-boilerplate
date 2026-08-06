"use client"

import { Check, X } from "lucide-react"

import {
  DynamicTable,
  RowActionItem,
  RowActionsMenu,
  TableSkeleton,
} from "@/components/shared/table"
import {
  timeOffTableColumns,
  toTimeOffTableRow,
} from "@/features/time-off/components/tables/time-off-table-columns"
import type { TimeOffRequest } from "@/features/time-off/types/time-off-types"

export type TimeOffListPageProps = {
  loaded: boolean
  requests: TimeOffRequest[]
  rows: ReturnType<typeof toTimeOffTableRow>[]
  onApprove: (request: TimeOffRequest) => void
  onReject: (request: TimeOffRequest) => void
}

/** Stateless team time-off inbox — state from `useTimeOffListPage`. */
export function TimeOffListPage({
  loaded,
  requests,
  rows,
  onApprove,
  onReject,
}: TimeOffListPageProps) {
  if (!loaded) {
    return <TableSkeleton />
  }

  const hasReviewableRequests = requests.some(
    (request) => request.canReview && request.status === "PENDING",
  )

  return (
    <DynamicTable
      data={rows}
      columns={timeOffTableColumns}
      searchable
      sortable
      filterable
      groupable
      rowActions={
        hasReviewableRequests
          ? ({ row }) => {
              const request = requests.find((item) => item.id === row.id)
              if (
                !request ||
                !request.canReview ||
                request.status !== "PENDING"
              ) {
                return null
              }

              return (
                <RowActionsMenu
                  label={`Review time off for ${request.userName ?? "employee"}`}
                >
                  <RowActionItem
                    label="Approve"
                    icon={<Check className="h-4 w-4" />}
                    onClick={() => onApprove(request)}
                  />
                  <RowActionItem
                    label="Reject"
                    icon={<X className="h-4 w-4" />}
                    destructive
                    onClick={() => onReject(request)}
                  />
                </RowActionsMenu>
              )
            }
          : undefined
      }
    />
  )
}
