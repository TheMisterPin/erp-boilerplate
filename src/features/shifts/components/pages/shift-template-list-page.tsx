"use client"

import { CalendarPlus, Pencil, Plus, Trash2 } from "lucide-react"

import {
  DataTableFrame,
  DynamicTable,
  RowActionItem,
  RowActionsMenu,
} from "@/components/shared/table"
import { Button } from "@/components/ui/button"
import {
  shiftTemplateTableColumns,
  toShiftTemplateTableRow,
} from "@/features/shifts/components/tables/shift-template-table-columns"
import type { ShiftTemplate } from "@/features/shifts/types/shift-types"

export type ShiftTemplateListPageProps = {
  loaded: boolean
  templates: ShiftTemplate[]
  rows: ReturnType<typeof toShiftTemplateTableRow>[]
  canWrite: boolean
  onCreate: () => void
  onEdit: (template: ShiftTemplate) => void
  onDelete: (template: ShiftTemplate) => void
  onGenerate: (template: ShiftTemplate) => void
}

/** Stateless shift templates list — state from `useShiftTemplateListPage`. */
export function ShiftTemplateListPage({
  loaded,
  templates,
  rows,
  canWrite,
  onCreate,
  onEdit,
  onDelete,
  onGenerate,
}: ShiftTemplateListPageProps) {
  const createButton = canWrite ? (
    <Button size="sm" onClick={onCreate}>
      <Plus className="mr-2 h-4 w-4" />
      New template
    </Button>
  ) : null

  if (!loaded) {
    return (
      <DataTableFrame>
        <p className="text-sm text-muted-foreground">Loading templates…</p>
      </DataTableFrame>
    )
  }

  if (templates.length === 0) {
    return (
      <DataTableFrame
        toolbar={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {createButton}
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          No shift templates found.
        </p>
      </DataTableFrame>
    )
  }

  return (
    <DynamicTable
      data={rows}
      columns={shiftTemplateTableColumns}
      searchable
      sortable
      filterable
      toolbarActions={createButton}
      rowActions={
        canWrite
          ? ({ row }) => {
              const template = templates.find((item) => item.id === row.id)
              if (!template) return null
              return (
                <RowActionsMenu
                  label={`Actions for ${template.userName ?? "template"}`}
                >
                  <RowActionItem
                    label="Generate shifts"
                    icon={<CalendarPlus className="h-4 w-4" />}
                    onClick={() => onGenerate(template)}
                  />
                  <RowActionItem
                    label="Edit"
                    icon={<Pencil className="h-4 w-4" />}
                    onClick={() => onEdit(template)}
                  />
                  <RowActionItem
                    label="Delete"
                    icon={<Trash2 className="h-4 w-4" />}
                    destructive
                    onClick={() => void onDelete(template)}
                  />
                </RowActionsMenu>
              )
            }
          : undefined
      }
    />
  )
}
