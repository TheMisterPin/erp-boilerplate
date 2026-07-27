import type { Role } from "@/generated/prisma/client"

export type UserRole = Role

/** Public user shape returned by server actions (no password). */
export type User = {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  role: UserRole
  pictureUrl?: string | null
  departmentId?: string | null
  departmentName?: string | null
  locationId?: string | null
  locationName?: string | null
  isActive: boolean
  isVerified: boolean
  createdAt?: Date
  updatedAt?: Date
}

/** Form values for create / update (password only on create / optional change). */
export type UserFormValues = {
  email: string
  firstName: string
  lastName: string
  role: UserRole
  password?: string
  departmentId?: string
  locationId?: string
  pictureUrl?: string
  isActive?: boolean
}

/** Manager / admin assign-location form. */
export type AssignLocationFormValues = {
  locationId: string
}
