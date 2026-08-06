"use client"

import { TablePageViewport } from "@/components/shared/table"
import { TimeOffListPage } from "@/features/time-off/components/pages/time-off-list-page"
import { useTimeOffListPage } from "@/features/time-off/hooks/use-time-off-list-page"

export default function TeamTimeOffPage() {
  const page = useTimeOffListPage()

  return (
    <TablePageViewport>
      <TimeOffListPage {...page} />
    </TablePageViewport>
  )
}
