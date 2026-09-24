import type { OrganizationRoleKey } from "@/generated/prisma/client"

/** Safe current-user shape — never includes password. */
export type Me = {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  role: OrganizationRoleKey
  pictureUrl: string | null
  isActive: boolean
  isVerified: boolean
  departmentId: string | null
  locationId: string | null
}

export function toMe(user: {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  pictureUrl: string | null
  isActive: boolean
  isVerified: boolean
  departmentId: string | null
  locationId: string | null
}, role: OrganizationRoleKey): Me {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    role,
    pictureUrl: user.pictureUrl,
    isActive: user.isActive,
    isVerified: user.isVerified,
    departmentId: user.departmentId,
    locationId: user.locationId,
  }
}
