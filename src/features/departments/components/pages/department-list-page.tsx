"use client"

import { Pencil, Plus, Trash2 } from "lucide-react"

import {
  DataTableFrame,
  DynamicTable,
  RowActionItem,
  RowActionsMenu,
} from "@/components/shared/table"
import { Button } from "@/components/ui/button"
import {
  departmentTableColumns,
  toDepartmentTableRow,
} from "@/features/departments/components/tables/department-table-columns"
import type { Department } from "@/features/departments/types/department-types"

export type DepartmentListPageProps = {
  loaded: boolean
  departments: Department[]
  rows: ReturnType<typeof toDepartmentTableRow>[]
  canWrite: boolean
  onCreate: () => void
  onEdit: (department: Department) => void
  onDelete: (department: Department) => void
}

/** Stateless departments list view — state from `useDepartmentListPage`. */
export function DepartmentListPage({
  loaded,
  departments,
  rows,
  canWrite,
  onCreate,
  onEdit,
  onDelete,
}: DepartmentListPageProps) {
  const createButton = canWrite ? (
    <Button size="sm" onClick={onCreate}>
      <Plus className="mr-2 h-4 w-4" />
      New department
    </Button>
  ) : null

  if (!loaded) {
    return (
      <DataTableFrame>
        <p className="text-sm text-muted-foreground">Loading departments…</p>
      </DataTableFrame>
    )
  }

  if (departments.length === 0) {
    return (
      <DataTableFrame
        toolbar={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {createButton}
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">No departments found.</p>
      </DataTableFrame>
    )
  }

  return (
    <DynamicTable
      data={rows}
      columns={departmentTableColumns}
      searchable
      sortable
      filterable
      groupable
      toolbarActions={createButton}
      rowActions={
        canWrite
          ? ({ row }) => {
              const department = departments.find((item) => item.id === row.id)
              if (!department) return null
              return (
                <RowActionsMenu label={`Actions for ${department.name}`}>
                  <RowActionItem
                    label="Edit"
                    icon={<Pencil className="h-4 w-4" />}
                    onClick={() => onEdit(department)}
                  />
                  <RowActionItem
                    label="Delete"
                    icon={<Trash2 className="h-4 w-4" />}
                    destructive
                    onClick={() => void onDelete(department)}
                  />
                </RowActionsMenu>
              )
            }
          : undefined
      }
    />
  )
}
