"use client"

import { ShiftTemplateListPage } from "@/features/shifts/components/pages/shift-template-list-page"
import { useShiftTemplateListPage } from "@/features/shifts/hooks/use-shift-template-list-page"

export default function ShiftTemplatesPage() {
  const page = useShiftTemplateListPage()

  return (
    <div className="-m-4 flex h-[calc(100svh-4rem)] min-h-0 w-[calc(100%+2rem)] flex-col overflow-hidden">
      <ShiftTemplateListPage {...page} />
    </div>
  )
}
