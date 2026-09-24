import type {
  MembershipStatus,
  OrganizationRoleKey,
} from "@/generated/prisma/client"
import type { Permission } from "@/features/auth/permissions"

export type OrganizationOption = {
  id: string
  name: string
  slug: string
  role: OrganizationRoleKey
  isCurrent: boolean
}

export type OrganizationRoleOption = {
  id: string
  key: OrganizationRoleKey
  name: string
  permissions: Permission[]
}

export type OrganizationMembership = {
  id: string
  userId: string
  fullName: string
  email: string
  pictureUrl: string | null
  status: MembershipStatus
  roleId: string
  roleKey: OrganizationRoleKey
  roleName: string
  departmentName: string | null
  locationName: string | null
  joinedAt: Date
  updatedAt: Date
}

export type AddMembershipFormValues = {
  email: string
  roleId: string
}

export type ChangeMembershipRoleFormValues = {
  roleId: string
}
