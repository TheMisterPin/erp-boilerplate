"use client"

import { Skeleton } from "@/components/ui/skeleton"

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

/** Calendar-shaped loading stand-in for the shift schedule page. */
export function ShiftScheduleSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading shifts…">
      <div className="w-full rounded-lg border border-border bg-background shadow-sm">
        <div className="border-b border-border p-4 sm:p-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-56" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-9 w-14" />
            <Skeleton className="ml-auto h-9 w-28" />
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-6">
          <div className="grid grid-cols-7 gap-2">
            {WEEK_DAYS.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-sm font-semibold text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid auto-rows-max grid-cols-7 gap-2">
            {Array.from({ length: 35 }, (_, index) => (
              <div
                key={index}
                className="min-h-24 rounded-lg border-2 border-border p-2"
              >
                <Skeleton className="mb-2 h-4 w-6" />
                {index % 4 === 0 ? (
                  <Skeleton className="mb-1 h-5 w-full rounded" />
                ) : null}
                {index % 7 === 2 ? (
                  <Skeleton className="h-5 w-full max-w-20 rounded" />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="rounded-lg border border-border bg-muted/30 p-4"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-3 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
