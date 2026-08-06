import type { Role } from "@/generated/prisma/client"

export type Profile = {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  role: Role
  pictureUrl: string | null
  departmentId: string | null
  departmentName: string | null
  locationId: string | null
  locationName: string | null
}

export type ProfileFormValues = {
  firstName: string
  lastName: string
  pictureUrl?: string
  password?: string
}
