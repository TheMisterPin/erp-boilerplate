"use server"

import { Actions } from "@/features/auth/permissions"
import { authorize, requireSession } from "@/features/auth/session"
import { hashPassword } from "@/features/auth/password"
import type { ActionResult } from "@/features/errors/dto"
import { AppError, withErrorBoundary } from "@/features/errors/server"
import { logActivity } from "@/features/logging/server"
import type { User } from "@/features/users/types/user-types"
import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/db"
import {
  assignUserLocationSchema,
  createUserSchema,
  updateUserSchema,
} from "@/lib/schemas/user"

type UserRow = {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  role: User["role"]
  pictureUrl: string | null
  departmentId: string | null
  locationId: string | null
  isActive: boolean
  isVerified: boolean
  createdAt: Date
  updatedAt: Date
  department?: { name: string } | null
  location?: { name: string } | null
}

const userInclude = {
  department: { select: { name: true } },
  location: { select: { name: true } },
} as const

function toPublicUser(row: UserRow): User {
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
    isActive: row.isActive,
    isVerified: row.isVerified,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function fullNameFrom(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim()
}

async function assertDepartmentExists(
  departmentId: string | null,
): Promise<void> {
  if (!departmentId) return
  const department = await prisma.department.findFirst({
    where: { id: departmentId, deletedAt: null },
    select: { id: true },
  })
  if (!department) {
    throw new AppError({
      kind: "not_found",
      code: "DEPARTMENT_NOT_FOUND",
      message: "That department could not be found.",
    })
  }
}

async function assertLocationExists(locationId: string | null): Promise<void> {
  if (!locationId) return
  const location = await prisma.location.findFirst({
    where: { id: locationId, deletedAt: null },
    select: { id: true },
  })
  if (!location) {
    throw new AppError({
      kind: "not_found",
      code: "LOCATION_NOT_FOUND",
      message: "That location could not be found.",
    })
  }
}

export async function listUsers(): Promise<ActionResult<User[]>> {
  return withErrorBoundary(async () => {
    await authorize(Actions.users.read)
    const rows = await prisma.user.findMany({
      where: { deletedAt: null },
      include: userInclude,
      orderBy: { createdAt: "desc" },
    })
    return rows.map(toPublicUser)
  })
}

export async function createUser(
  input: unknown,
): Promise<ActionResult<User>> {
  return withErrorBoundary(async () => {
    await authorize(Actions.users.write)
    const parsed = createUserSchema.parse(input)

    const departmentId = parsed.departmentId || null
    const locationId = parsed.locationId || null
    await assertDepartmentExists(departmentId)
    await assertLocationExists(locationId)

    const passwordHash = await hashPassword(parsed.password)
    const fullName = fullNameFrom(parsed.firstName, parsed.lastName)

    try {
      const row = await prisma.user.create({
        data: {
          email: parsed.email,
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          fullName,
          password: passwordHash,
          role: parsed.role,
          departmentId,
          locationId,
          pictureUrl: parsed.pictureUrl || null,
          isActive: parsed.isActive ?? true,
        },
        include: userInclude,
      })

      await logActivity({
        userId: row.id,
        activity: "REGISTER",
      })

      return toPublicUser(row)
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        throw new AppError({
          kind: "conflict",
          code: "DUPLICATE_EMAIL",
          message: "A user with this email already exists.",
        })
      }
      throw e
    }
  })
}

export async function updateUser(
  input: unknown,
): Promise<ActionResult<User>> {
  return withErrorBoundary(async () => {
    await authorize(Actions.users.write)
    const parsed = updateUserSchema.parse(input)

    const existing = await prisma.user.findFirst({
      where: { id: parsed.id, deletedAt: null },
    })
    if (!existing) {
      throw new AppError({
        kind: "not_found",
        code: "USER_NOT_FOUND",
        message: "That user could not be found.",
      })
    }

    const departmentId = parsed.departmentId || null
    const locationId = parsed.locationId || null
    await assertDepartmentExists(departmentId)
    await assertLocationExists(locationId)

    const fullName = fullNameFrom(parsed.firstName, parsed.lastName)
    const data: Prisma.UserUncheckedUpdateInput = {
      email: parsed.email,
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      fullName,
      role: parsed.role,
      departmentId,
      locationId,
      pictureUrl: parsed.pictureUrl || null,
      isActive: parsed.isActive ?? existing.isActive,
    }

    if (parsed.password && parsed.password.length > 0) {
      data.password = await hashPassword(parsed.password)
    }

    try {
      const row = await prisma.user.update({
        where: { id: parsed.id },
        data,
        include: userInclude,
      })
      return toPublicUser(row)
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        throw new AppError({
          kind: "conflict",
          code: "DUPLICATE_EMAIL",
          message: "A user with this email already exists.",
        })
      }
      throw e
    }
  })
}

export async function deleteUser(id: string): Promise<ActionResult<true>> {
  return withErrorBoundary(async () => {
    await authorize(Actions.users.write)
    const existing = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    })
    if (!existing) {
      throw new AppError({
        kind: "not_found",
        code: "USER_NOT_FOUND",
        message: "That user could not be found.",
      })
    }

    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    })

    return true as const
  })
}

/**
 * Assign a user to a location. Admins may assign any location;
 * location managers may only assign users to locations they manage.
 */
export async function assignUserToLocation(
  input: unknown,
): Promise<ActionResult<User>> {
  return withErrorBoundary(async () => {
    const session = await requireSession()
    const parsed = assignUserLocationSchema.parse(input)
    const locationId = parsed.locationId || null

    const existing = await prisma.user.findFirst({
      where: { id: parsed.userId, deletedAt: null },
    })
    if (!existing) {
      throw new AppError({
        kind: "not_found",
        code: "USER_NOT_FOUND",
        message: "That user could not be found.",
      })
    }

    if (locationId) {
      const location = await prisma.location.findFirst({
        where: { id: locationId, deletedAt: null },
        select: { id: true, managerId: true },
      })
      if (!location) {
        throw new AppError({
          kind: "not_found",
          code: "LOCATION_NOT_FOUND",
          message: "That location could not be found.",
        })
      }

      const isAdmin = session.role === "ADMIN"
      const managesLocation = location.managerId === session.userId
      if (!isAdmin && !managesLocation) {
        throw new AppError({
          kind: "permission",
          code: "FORBIDDEN",
          message: "You can only assign users to locations you manage.",
        })
      }
    } else if (session.role !== "ADMIN") {
      // Managers may clear assignment only if the user is currently at their location
      if (!existing.locationId) {
        throw new AppError({
          kind: "permission",
          code: "FORBIDDEN",
          message: "You do not have permission to clear that assignment.",
        })
      }
      const currentLocation = await prisma.location.findFirst({
        where: { id: existing.locationId, deletedAt: null },
        select: { managerId: true },
      })
      if (currentLocation?.managerId !== session.userId) {
        throw new AppError({
          kind: "permission",
          code: "FORBIDDEN",
          message: "You can only manage staff at your locations.",
        })
      }
    }

    const row = await prisma.user.update({
      where: { id: parsed.userId },
      data: { locationId },
      include: userInclude,
    })

    return toPublicUser(row)
  })
}
