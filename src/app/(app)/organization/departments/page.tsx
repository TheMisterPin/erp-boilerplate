"use client"

import { TablePageViewport } from "@/components/shared/table"
import { DepartmentListPage } from "@/features/departments/components/pages/department-list-page"
import { useDepartmentListPage } from "@/features/departments/hooks/use-department-list-page"

export default function OrganizationDepartmentsPage() {
  const page = useDepartmentListPage()

  return (
    <TablePageViewport>
      <DepartmentListPage {...page} />
    </TablePageViewport>
  )
}
