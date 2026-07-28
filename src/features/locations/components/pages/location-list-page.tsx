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
  locationTableColumns,
  toLocationTableRow,
} from "@/features/locations/components/tables/location-table-columns"
import type { Location } from "@/features/locations/types/location-types"

export type LocationListPageProps = {
  loaded: boolean
  locations: Location[]
  rows: ReturnType<typeof toLocationTableRow>[]
  canWrite: boolean
  onCreate: () => void
  onEdit: (location: Location) => void
  onDelete: (location: Location) => void
}

type LocationSectionProps = {
  title: string
  emptyMessage: string
  locations: Location[]
  rows: ReturnType<typeof toLocationTableRow>[]
  canWrite: boolean
  onEdit: (location: Location) => void
  onDelete: (location: Location) => void
}

function LocationSection({
  title,
  emptyMessage,
  locations,
  rows,
  canWrite,
  onEdit,
  onDelete,
}: LocationSectionProps) {
  return (
    <section className="flex min-h-0 flex-1 basis-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-2 px-1 pb-2">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        <span className="text-xs text-muted-foreground">
          {locations.length}
        </span>
      </div>
      {locations.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed p-6">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border">
          <DynamicTable
            data={rows}
            columns={locationTableColumns}
            searchable
            sortable
            filterable
            rowActions={
              canWrite
                ? ({ row }) => {
                    const location = locations.find((item) => item.id === row.id)
                    if (!location) return null
                    return (
                      <RowActionsMenu label={`Actions for ${location.name}`}>
                        <RowActionItem
                          label="Edit"
                          icon={<Pencil className="h-4 w-4" />}
                          onClick={() => onEdit(location)}
                        />
                        <RowActionItem
                          label="Delete"
                          icon={<Trash2 className="h-4 w-4" />}
                          destructive
                          onClick={() => void onDelete(location)}
                        />
                      </RowActionsMenu>
                    )
                  }
                : undefined
            }
          />
        </div>
      )}
    </section>
  )
}

/** Stateless locations list — with-manager and without-manager sections. */
export function LocationListPage({
  loaded,
  locations,
  canWrite,
  onCreate,
  onEdit,
  onDelete,
}: LocationListPageProps) {
  const createButton = canWrite ? (
    <Button size="sm" onClick={onCreate}>
      <Plus className="mr-2 h-4 w-4" />
      New location
    </Button>
  ) : null

  if (!loaded) {
    return (
      <DataTableFrame>
        <p className="text-sm text-muted-foreground">Loading locations…</p>
      </DataTableFrame>
    )
  }

  const withManager = locations.filter((location) => !!location.managerId)
  const withoutManager = locations.filter((location) => !location.managerId)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Locations</h1>
          <p className="text-sm text-muted-foreground">
            Managers and staffing targets by site.
          </p>
        </div>
        {createButton}
      </header>

      {locations.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-8">
          <p className="text-sm text-muted-foreground">No locations found.</p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4">
          <LocationSection
            title="With a manager"
            emptyMessage="No locations have a manager assigned yet."
            locations={withManager}
            rows={withManager.map(toLocationTableRow)}
            canWrite={canWrite}
            onEdit={onEdit}
            onDelete={onDelete}
          />
          <LocationSection
            title="Without a manager"
            emptyMessage="Every location has a manager."
            locations={withoutManager}
            rows={withoutManager.map(toLocationTableRow)}
            canWrite={canWrite}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      )}
    </div>
  )
}
