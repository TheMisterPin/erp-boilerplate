"use server"

import { requireSession } from "@/features/auth/session"
import { hashPassword } from "@/features/auth/password"
import type { ActionResult } from "@/features/errors/dto"
import { AppError, withErrorBoundary } from "@/features/errors/server"
import { logActivity } from "@/features/logging/server"
import type { Profile } from "@/features/profile/types/profile-types"
import { prisma } from "@/lib/db"
import { updateOwnProfileSchema } from "@/lib/schemas/profile"

const profileInclude = {
  department: { select: { name: true } },
  location: { select: { name: true } },
} as const

function toProfile(row: {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  role: Profile["role"]
  pictureUrl: string | null
  departmentId: string | null
  locationId: string | null
  department?: { name: string } | null
  location?: { name: string } | null
}): Profile {
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: row.fullName,
    role: row.role,
    pictureUrl: row.pictureUrl,
    departmentId: row.departmentId,
    departmentName: row.department?.name ?? null,
    locationId: row.locationId,
    locationName: row.location?.name ?? null,
  }
}

function fullNameFrom(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim()
}

function userNotFound(): AppError {
  return new AppError({
    kind: "not_found",
    code: "USER_NOT_FOUND",
    message: "Your profile could not be found.",
  })
}

export async function getProfile(): Promise<ActionResult<Profile>> {
  return withErrorBoundary(async () => {
    const session = await requireSession()
    const row = await prisma.user.findFirst({
      where: { id: session.userId, deletedAt: null },
      include: profileInclude,
    })
    if (!row) throw userNotFound()
    return toProfile(row)
  })
}

export async function updateOwnProfile(
  input: unknown,
): Promise<ActionResult<Profile>> {
  return withErrorBoundary(async () => {
    const session = await requireSession()
    const parsed = updateOwnProfileSchema.parse(input)
    const pictureUrl = parsed.pictureUrl || null
    const passwordChanged = Boolean(parsed.password && parsed.password.length > 0)

    const data: {
      firstName: string
      lastName: string
      fullName: string
      pictureUrl: string | null
      password?: string
    } = {
      firstName: parsed.firstName.trim(),
      lastName: parsed.lastName.trim(),
      fullName: fullNameFrom(parsed.firstName, parsed.lastName),
      pictureUrl,
    }
    if (passwordChanged && parsed.password) {
      data.password = await hashPassword(parsed.password)
    }

    const update = await prisma.user.updateMany({
      where: { id: session.userId, deletedAt: null },
      data,
    })
    if (update.count === 0) throw userNotFound()

    const row = await prisma.user.findFirst({
      where: { id: session.userId, deletedAt: null },
      include: profileInclude,
    })
    if (!row) throw userNotFound()

    await logActivity({
      userId: session.userId,
      activity: "PROFILE_UPDATE",
      activityData: {
        fields: Object.keys(data).filter((key) => key !== "password"),
        passwordChanged,
      },
    })

    return toProfile(row)
  })
}
