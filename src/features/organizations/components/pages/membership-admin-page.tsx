"use client"

import { KeyRound, Plus, ShieldCheck, Trash2, UserRoundCheck, UserRoundX } from "lucide-react"

import {
  DataTableFrame,
  DynamicTable,
  RowActionItem,
  RowActionsMenu,
  TableSkeleton,
} from "@/components/shared/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  membershipTableColumns,
  toMembershipTableRow,
} from "@/features/organizations/components/tables/membership-table-columns"
import type {
  OrganizationMembership,
  OrganizationRoleOption,
} from "@/features/organizations/types/organization-types"

export type MembershipAdminPageProps = {
  loaded: boolean
  canRead: boolean
  canWrite: boolean
  memberships: OrganizationMembership[]
  roles: OrganizationRoleOption[]
  rows: ReturnType<typeof toMembershipTableRow>[]
  onAdd: () => void
  onChangeRole: (membership: OrganizationMembership) => void
  onChangeStatus: (membership: OrganizationMembership) => void
  onRemove: (membership: OrganizationMembership) => void
}

function PermissionMatrix({ roles }: { roles: OrganizationRoleOption[] }) {
  return (
    <div className="min-h-0 overflow-auto rounded-md border">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-surface-1 text-muted-foreground">
          <tr className="border-b">
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Permissions</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role.id} className="border-b last:border-0">
              <td className="px-4 py-3 align-top">
                <div className="font-medium">{role.name}</div>
                <div className="text-xs text-muted-foreground">{role.key}</div>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {role.permissions.map((permission) => (
                    <Badge key={permission} variant="secondary">
                      {permission}
                    </Badge>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function MembershipAdminPage({
  loaded,
  canRead,
  canWrite,
  memberships,
  roles,
  rows,
  onAdd,
  onChangeRole,
  onChangeStatus,
  onRemove,
}: MembershipAdminPageProps) {
  const addButton = canWrite ? (
    <Button size="sm" disabled={!loaded || roles.length === 0} onClick={onAdd}>
      <Plus className="mr-2 h-4 w-4" />
      Add membership
    </Button>
  ) : null

  if (!canRead && loaded) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
        You do not have permission to view organization memberships.
      </div>
    )
  }

  if (!loaded) {
    return <TableSkeleton toolbarActions={addButton} />
  }

  return (
    <Tabs defaultValue="memberships" className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Organization access</h2>
          <p className="text-sm text-muted-foreground">
            Manage memberships and review the permissions granted by each role.
          </p>
        </div>
      </header>
      <TabsList className="mx-4 mt-3 w-fit shrink-0 self-start">
        <TabsTrigger value="memberships">Memberships ({memberships.length})</TabsTrigger>
        <TabsTrigger value="permissions">Permission matrix</TabsTrigger>
      </TabsList>
      <TabsContent
        value="memberships"
        className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 data-[state=inactive]:hidden"
      >
        {memberships.length === 0 ? (
          <DataTableFrame
            toolbar={
              <div className="flex w-full items-center justify-end">{addButton}</div>
            }
          >
            <p className="text-sm text-muted-foreground">No memberships found.</p>
          </DataTableFrame>
        ) : (
          <DynamicTable
            data={rows}
            columns={membershipTableColumns}
            searchable
            sortable
            filterable
            groupable
            toolbarActions={addButton}
            rowActions={
              canWrite
                ? ({ row }) => {
                    const membership = memberships.find((item) => item.id === row.id)
                    if (!membership) return null
                    const active = membership.status === "ACTIVE"
                    return (
                      <RowActionsMenu label={`Actions for ${membership.fullName}`}>
                        <RowActionItem
                          label="Change role"
                          icon={<KeyRound className="h-4 w-4" />}
                          onClick={() => onChangeRole(membership)}
                        />
                        <RowActionItem
                          label={active ? "Deactivate" : "Activate"}
                          icon={
                            active ? (
                              <UserRoundX className="h-4 w-4" />
                            ) : (
                              <UserRoundCheck className="h-4 w-4" />
                            )
                          }
                          destructive={active}
                          onClick={() => void onChangeStatus(membership)}
                        />
                        <RowActionItem
                          label="Remove from organization"
                          icon={<Trash2 className="h-4 w-4" />}
                          destructive
                          onClick={() => void onRemove(membership)}
                        />
                      </RowActionsMenu>
                    )
                  }
                : undefined
            }
          />
        )}
      </TabsContent>
      <TabsContent
        value="permissions"
        className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 data-[state=inactive]:hidden"
      >
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Roles are enforced on the server; this preview is read-only.
        </div>
        <PermissionMatrix roles={roles} />
      </TabsContent>
    </Tabs>
  )
}
