import type { Role } from "@/generated/prisma/client"
import type { ShiftInstance } from "@/features/shifts/types/shift-types"
import type { TimeOffRequest } from "@/features/time-off/types/time-off-types"

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

/** Single round-trip payload for the profile hub. */
export type ProfilePageData = {
  profile: Profile
  upcomingShifts: ShiftInstance[]
  ownRequests: TimeOffRequest[]
}
