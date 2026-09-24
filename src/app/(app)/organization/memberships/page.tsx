"use client"

import { TablePageViewport } from "@/components/shared/table"
import { MembershipAdminPage } from "@/features/organizations/components/pages/membership-admin-page"
import { useMembershipAdminPage } from "@/features/organizations/hooks/use-membership-admin-page"

export default function OrganizationMembershipsPage() {
  const page = useMembershipAdminPage()

  return (
    <TablePageViewport>
      <MembershipAdminPage {...page} />
    </TablePageViewport>
  )
}
