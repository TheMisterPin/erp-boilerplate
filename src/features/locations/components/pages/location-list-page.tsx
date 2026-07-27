"use client"

import { Pencil, Plus, Trash2 } from "lucide-react"

import { DynamicTable } from "@/components/shared/table/dynamic-table"
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
  toolbarActions?: React.ReactNode
  onEdit: (location: Location) => void
  onDelete: (location: Location) => void
}

function LocationSection({
  title,
  emptyMessage,
  locations,
  rows,
  canWrite,
  toolbarActions,
  onEdit,
  onDelete,
}: LocationSectionProps) {
  return (
    <section className="flex min-h-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        <span className="text-xs text-muted-foreground">
          {locations.length}
        </span>
      </div>
      {locations.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="min-h-[240px] overflow-hidden rounded-lg border">
          <DynamicTable
            data={rows}
            columns={locationTableColumns}
            pageSize={8}
            searchable
            sortable
            filterable
            toolbarActions={toolbarActions}
            rowActions={
              canWrite
                ? ({ row }) => {
                    const location = locations.find((item) => item.id === row.id)
                    if (!location) return null
                    return (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${location.name}`}
                          onClick={() => onEdit(location)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${location.name}`}
                          onClick={() => void onDelete(location)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
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
      <div className="table-shell">
        <div className="table-body-region">
          <p className="text-sm text-muted-foreground">Loading locations…</p>
        </div>
      </div>
    )
  }

  const withManager = locations.filter((location) => !!location.managerId)
  const withoutManager = locations.filter((location) => !location.managerId)

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Locations</h1>
          <p className="text-sm text-muted-foreground">
            Managers and staffing targets by site.
          </p>
        </div>
        {createButton}
      </header>

      {locations.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8">
          <p className="text-sm text-muted-foreground">No locations found.</p>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  )
}
