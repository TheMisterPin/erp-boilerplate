"use client"

import { TablePageViewport } from "@/components/shared/table"
import { UserListPage } from "@/features/users/components/pages/user-list-page"
import { useUserListPage } from "@/features/users/hooks/use-user-list-page"

export default function TeamMembersPage() {
  const page = useUserListPage()

  return (
    <TablePageViewport>
      <UserListPage {...page} />
    </TablePageViewport>
  )
}
