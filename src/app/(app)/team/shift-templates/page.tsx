"use client"

import { TablePageViewport } from "@/components/shared/table"
import { ShiftTemplateListPage } from "@/features/shifts/components/pages/shift-template-list-page"
import { useShiftTemplateListPage } from "@/features/shifts/hooks/use-shift-template-list-page"

export default function ShiftTemplatesPage() {
  const page = useShiftTemplateListPage()

  return (
    <TablePageViewport>
      <ShiftTemplateListPage {...page} />
    </TablePageViewport>
  )
}
