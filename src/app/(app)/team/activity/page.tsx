"use client"

import { TablePageViewport } from "@/components/shared/table"
import { ActivityListPage } from "@/features/logging/components/pages/activity-list-page"
import { useActivityListPage } from "@/features/logging/hooks/use-activity-list-page"

export default function TeamActivityPage() {
  const page = useActivityListPage()

  return (
    <TablePageViewport>
      <ActivityListPage {...page} />
    </TablePageViewport>
  )
}
