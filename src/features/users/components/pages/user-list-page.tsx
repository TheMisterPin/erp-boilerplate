"use client"

import { MapPin, Pencil, Plus, Trash2 } from "lucide-react"

import {
  DynamicTable,
  RowActionItem,
  RowActionsMenu,
  TableSkeleton,
} from "@/components/shared/table"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  toUserTableRow,
  userTableColumns,
} from "@/features/users/components/tables/user-table-columns"
import type { User } from "@/features/users/types/user-types"

export type UserListPageProps = {
  loaded: boolean
  users: User[]
  rows: ReturnType<typeof toUserTableRow>[]
  canWrite: boolean
  canAssignLocation: boolean
  onCreate: () => void
  onEdit: (user: User) => void
  onDelete: (user: User) => void
  onAssignLocation: (user: User) => void
}

type UserTabPanelProps = {
  emptyMessage: string
  users: User[]
  canWrite: boolean
  canAssignLocation: boolean
  onEdit: (user: User) => void
  onDelete: (user: User) => void
  onAssignLocation: (user: User) => void
}

function UserTabPanel({
  emptyMessage,
  users,
  canWrite,
  canAssignLocation,
  onEdit,
  onDelete,
  onAssignLocation,
}: UserTabPanelProps) {
  const showActions = canWrite || canAssignLocation

  if (users.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed p-6">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <DynamicTable
        data={users.map(toUserTableRow)}
        columns={userTableColumns}
        searchable
        sortable
        filterable
        rowActions={
          showActions
            ? ({ row }) => {
                const user = users.find((item) => item.id === row.id)
                if (!user) return null
                return (
                  <RowActionsMenu label={`Actions for ${user.fullName}`}>
                    {canAssignLocation ? (
                      <RowActionItem
                        label="Assign location"
                        icon={<MapPin className="h-4 w-4" />}
                        onClick={() => onAssignLocation(user)}
                      />
                    ) : null}
                    {canWrite ? (
                      <RowActionItem
                        label="Edit"
                        icon={<Pencil className="h-4 w-4" />}
                        onClick={() => onEdit(user)}
                      />
                    ) : null}
                    {canWrite ? (
                      <RowActionItem
                        label="Delete"
                        icon={<Trash2 className="h-4 w-4" />}
                        destructive
                        onClick={() => void onDelete(user)}
                      />
                    ) : null}
                  </RowActionsMenu>
                )
              }
            : undefined
        }
      />
    </div>
  )
}

/** Stateless members list — assigned / unassigned location tabs. */
export function UserListPage({
  loaded,
  users,
  canWrite,
  canAssignLocation,
  onCreate,
  onEdit,
  onDelete,
  onAssignLocation,
}: UserListPageProps) {
  const createButton = canWrite ? (
    <Button size="sm" onClick={onCreate} disabled={!loaded}>
      <Plus className="mr-2 h-4 w-4" />
      New member
    </Button>
  ) : null

  const withLocation = users.filter((user) => !!user.locationId)
  const withoutLocation = users.filter((user) => !user.locationId)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Members</h1>
          <p className="text-sm text-muted-foreground">
            Staff by location assignment.
          </p>
        </div>
        {createButton}
      </header>

      {!loaded ? (
        <Tabs
          defaultValue="with-location"
          className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-3 pb-4"
        >
          <TabsList className="mb-3 w-fit shrink-0 self-start">
            <TabsTrigger value="with-location" disabled>
              Assigned to a location (—)
            </TabsTrigger>
            <TabsTrigger value="without-location" disabled>
              Without a location (—)
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="with-location"
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
          >
            <TableSkeleton showToolsMenu />
          </TabsContent>
        </Tabs>
      ) : users.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-8">
          <p className="text-sm text-muted-foreground">No users found.</p>
        </div>
      ) : (
        <Tabs
          defaultValue="with-location"
          className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-3 pb-4"
        >
          <TabsList className="mb-3 w-fit shrink-0 self-start">
            <TabsTrigger value="with-location">
              Assigned to a location ({withLocation.length})
            </TabsTrigger>
            <TabsTrigger value="without-location">
              Without a location ({withoutLocation.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="with-location"
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
          >
            <UserTabPanel
              emptyMessage="No members are assigned to a location yet."
              users={withLocation}
              canWrite={canWrite}
              canAssignLocation={canAssignLocation}
              onEdit={onEdit}
              onDelete={onDelete}
              onAssignLocation={onAssignLocation}
            />
          </TabsContent>

          <TabsContent
            value="without-location"
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
          >
            <UserTabPanel
              emptyMessage="Every member has a location."
              users={withoutLocation}
              canWrite={canWrite}
              canAssignLocation={canAssignLocation}
              onEdit={onEdit}
              onDelete={onDelete}
              onAssignLocation={onAssignLocation}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
