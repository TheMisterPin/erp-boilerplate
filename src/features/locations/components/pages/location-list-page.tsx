"use client"

import { Pencil, Plus, Trash2 } from "lucide-react"

import {
  DynamicTable,
  RowActionItem,
  RowActionsMenu,
  TableSkeleton,
} from "@/components/shared/table"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

type LocationTabPanelProps = {
  emptyMessage: string
  locations: Location[]
  canWrite: boolean
  onEdit: (location: Location) => void
  onDelete: (location: Location) => void
}

function LocationTabPanel({
  emptyMessage,
  locations,
  canWrite,
  onEdit,
  onDelete,
}: LocationTabPanelProps) {
  if (locations.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed p-6">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <DynamicTable
        data={locations.map(toLocationTableRow)}
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
  )
}

/** Stateless locations list — manager / no-manager tabs. */
export function LocationListPage({
  loaded,
  locations,
  canWrite,
  onCreate,
  onEdit,
  onDelete,
}: LocationListPageProps) {
  const createButton = canWrite ? (
    <Button size="sm" onClick={onCreate} disabled={!loaded}>
      <Plus className="mr-2 h-4 w-4" />
      New location
    </Button>
  ) : null

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

      {!loaded ? (
        <Tabs
          defaultValue="with-manager"
          className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-3 pb-4"
        >
          <TabsList className="mb-3 w-fit shrink-0 self-start">
            <TabsTrigger value="with-manager" disabled>
              With a manager (—)
            </TabsTrigger>
            <TabsTrigger value="without-manager" disabled>
              Without a manager (—)
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="with-manager"
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
          >
            <TableSkeleton showToolsMenu />
          </TabsContent>
        </Tabs>
      ) : locations.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-8">
          <p className="text-sm text-muted-foreground">No locations found.</p>
        </div>
      ) : (
        <Tabs
          defaultValue="with-manager"
          className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-3 pb-4"
        >
          <TabsList className="mb-3 w-fit shrink-0 self-start">
            <TabsTrigger value="with-manager">
              With a manager ({withManager.length})
            </TabsTrigger>
            <TabsTrigger value="without-manager">
              Without a manager ({withoutManager.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="with-manager"
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
          >
            <LocationTabPanel
              emptyMessage="No locations have a manager assigned yet."
              locations={withManager}
              canWrite={canWrite}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </TabsContent>

          <TabsContent
            value="without-manager"
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
          >
            <LocationTabPanel
              emptyMessage="Every location has a manager."
              locations={withoutManager}
              canWrite={canWrite}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
