"use client"

import { MapPin, Pencil, Plus, Trash2 } from "lucide-react"

import {
  DataTableFrame,
  DynamicTable,
  RowActionItem,
  RowActionsMenu,
} from "@/components/shared/table"
import { Button } from "@/components/ui/button"
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

type UserSectionProps = {
  title: string
  emptyMessage: string
  users: User[]
  canWrite: boolean
  canAssignLocation: boolean
  onEdit: (user: User) => void
  onDelete: (user: User) => void
  onAssignLocation: (user: User) => void
}

function UserSection({
  title,
  emptyMessage,
  users,
  canWrite,
  canAssignLocation,
  onEdit,
  onDelete,
  onAssignLocation,
}: UserSectionProps) {
  const showActions = canWrite || canAssignLocation

  return (
    <section className="flex min-h-0 flex-1 basis-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-2 px-1 pb-2">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        <span className="text-xs text-muted-foreground">{users.length}</span>
      </div>
      {users.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed p-6">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
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
      )}
    </section>
  )
}

/** Stateless members list — with-location and without-location sections. */
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
    <Button size="sm" onClick={onCreate}>
      <Plus className="mr-2 h-4 w-4" />
      New member
    </Button>
  ) : null

  if (!loaded) {
    return (
      <DataTableFrame>
        <p className="text-sm text-muted-foreground">Loading members…</p>
      </DataTableFrame>
    )
  }

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

      {users.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-8">
          <p className="text-sm text-muted-foreground">No users found.</p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4">
          <UserSection
            title="Assigned to a location"
            emptyMessage="No members are assigned to a location yet."
            users={withLocation}
            canWrite={canWrite}
            canAssignLocation={canAssignLocation}
            onEdit={onEdit}
            onDelete={onDelete}
            onAssignLocation={onAssignLocation}
          />
          <UserSection
            title="Without a location"
            emptyMessage="Every member has a location."
            users={withoutLocation}
            canWrite={canWrite}
            canAssignLocation={canAssignLocation}
            onEdit={onEdit}
            onDelete={onDelete}
            onAssignLocation={onAssignLocation}
          />
        </div>
      )}
    </div>
  )
}
