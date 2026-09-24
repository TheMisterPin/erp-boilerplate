"use client"

import { Badge } from "@/components/ui/badge"
import type { ColumnConfig } from "@/components/shared/table/dynamic-table"
import type { OrganizationMembership } from "@/features/organizations/types/organization-types"

export const membershipTableColumns: ColumnConfig[] = [
  { key: "fullName", label: "Member", type: "string", sortable: true },
  { key: "email", label: "Email", type: "string", sortable: true },
  {
    key: "roleName",
    label: "Role",
    type: "string",
    sortable: true,
    format: (value) => <Badge variant="secondary">{String(value ?? "")}</Badge>,
  },
  { key: "departmentName", label: "Department", type: "string", sortable: true },
  { key: "locationName", label: "Location", type: "string", sortable: true },
  {
    key: "status",
    label: "Status",
    type: "string",
    sortable: true,
    format: (value) => (
      <Badge variant={value === "ACTIVE" ? "default" : "outline"}>
        {value === "ACTIVE" ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  { key: "joinedAt", label: "Joined", type: "date", sortable: true },
]

export function toMembershipTableRow(
  membership: OrganizationMembership,
): Record<string, unknown> {
  return {
    id: membership.id,
    fullName: membership.fullName,
    email: membership.email,
    roleName: membership.roleName,
    roleKey: membership.roleKey,
    departmentName: membership.departmentName ?? "",
    locationName: membership.locationName ?? "",
    status: membership.status,
    joinedAt: membership.joinedAt,
  }
}
