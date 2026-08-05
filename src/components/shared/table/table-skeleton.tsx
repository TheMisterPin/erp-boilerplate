"use client"

import type { ReactNode } from "react"
import { MoreHorizontal, Search } from "lucide-react"

import { DataTableFrame } from "@/components/shared/table/data-table-frame"
import { PAGE_SIZE } from "@/components/shared/table/table-constant"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export type TableSkeletonProps = {
  /** Right-side toolbar slot (e.g. disabled Create). */
  toolbarActions?: ReactNode
  /** Number of skeleton rows (default `PAGE_SIZE`). */
  rowCount?: number
  /** Show the table-tools `⋯` affordance (disabled). Default true. */
  showToolsMenu?: boolean
  className?: string
}

const CELL_WIDTHS = ["w-[28%]", "w-[22%]", "w-[18%]", "w-[16%]", "w-[12%]"] as const

/**
 * Loading stand-in for DynamicTable — real toolbar chrome (disabled) + skeleton rows.
 * Keep page chrome (headers / tabs) outside; pass disabled Create via `toolbarActions`.
 */
export function TableSkeleton({
  toolbarActions,
  rowCount = PAGE_SIZE,
  showToolsMenu = true,
  className,
}: TableSkeletonProps) {
  return (
    <DataTableFrame
      className={className}
      toolbar={
        <>
          <div className="relative min-w-0 flex-1">
            <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <div className="table-toolbar-search">
              <Input
                type="search"
                placeholder="Search…"
                className="grow border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled
                readOnly
                aria-disabled
              />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {showToolsMenu ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled
                aria-label="Table tools"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            ) : null}
            {toolbarActions}
          </div>
        </>
      }
      footer={
        <div className="table-footer-bar">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-40" />
        </div>
      }
    >
      <div
        className="table-surface"
        aria-busy="true"
        aria-label="Loading…"
        role="status"
      >
        <div className="table-head-row flex border-b">
          {CELL_WIDTHS.map((width) => (
            <div key={width} className={cn("table-head-cell flex-1", width)}>
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
        <div className="divide-y divide-[var(--table-border)]">
          {Array.from({ length: rowCount }, (_, rowIndex) => (
            <div
              key={rowIndex}
              className="table-body-row flex items-center"
            >
              {CELL_WIDTHS.map((width, cellIndex) => (
                <div
                  key={`${rowIndex}-${cellIndex}`}
                  className={cn("table-body-cell flex-1", width)}
                >
                  <Skeleton
                    className={cn("h-4", cellIndex === 0 ? "w-24" : "w-16")}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </DataTableFrame>
  )
}
