"use client"

import { CalendarPlus, Pencil, Plus, Trash2 } from "lucide-react"

import { DynamicTable } from "@/components/shared/table/dynamic-table"
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
      <div className="table-shell">
        <div className="table-body-region">
          <p className="text-sm text-muted-foreground">Loading templates…</p>
        </div>
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="table-shell">
        <header className="table-toolbar">
          <div />
          <div className="flex flex-wrap items-center gap-2">{createButton}</div>
        </header>
        <div className="table-body-region">
          <p className="text-sm text-muted-foreground">
            No shift templates found.
          </p>
        </div>
      </div>
    )
  }

  return (
    <DynamicTable
      data={rows}
      columns={shiftTemplateTableColumns}
      pageSize={10}
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
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Generate shifts from ${template.userName ?? "template"}`}
                    onClick={() => onGenerate(template)}
                  >
                    <CalendarPlus className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit template for ${template.userName ?? "user"}`}
                    onClick={() => onEdit(template)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete template for ${template.userName ?? "user"}`}
                    onClick={() => void onDelete(template)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )
            }
          : undefined
      }
    />
  )
}
