"use server"

import { Prisma } from "@/generated/prisma/client"

import { Actions, validStoredPermissions } from "@/features/auth/permissions"
import { authorize } from "@/features/auth/session"
import type { ActionResult } from "@/features/errors/dto"
import { AppError, withErrorBoundary } from "@/features/errors/server"
import { logActivity } from "@/features/logging/server"
import type {
  OrganizationMembership,
  OrganizationRoleOption,
} from "@/features/organizations/types/organization-types"
import { prisma } from "@/lib/db"
import {
  addMembershipSchema,
  changeMembershipRoleSchema,
  changeMembershipStatusSchema,
  removeMembershipSchema,
} from "@/lib/schemas/membership"

const membershipInclude = {
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      pictureUrl: true,
      isActive: true,
      deletedAt: true,
    },
  },
  department: { select: { name: true } },
  location: { select: { name: true } },
  roleAssignment: {
    select: {
      deletedAt: true,
      role: {
        select: {
          id: true,
          key: true,
          name: true,
          organizationId: true,
          isActive: true,
          deletedAt: true,
        },
      },
    },
  },
} as const

type MembershipRow = Prisma.MembershipGetPayload<{
  include: typeof membershipInclude
}>

function membershipNotFound(): AppError {
  return new AppError({
    kind: "not_found",
    code: "MEMBERSHIP_NOT_FOUND",
    message: "That membership could not be found.",
  })
}

function toPublicMembership(row: MembershipRow): OrganizationMembership {
  const assignment = row.roleAssignment
  const role = assignment?.role
  if (
    !assignment ||
    assignment.deletedAt ||
    !role ||
    !role.isActive ||
    role.deletedAt ||
    role.organizationId !== row.organizationId
  ) {
    throw new AppError({
      kind: "conflict",
      code: "INVALID_ROLE_ASSIGNMENT",
      message: "This membership does not have a valid organization role.",
    })
  }

  return {
    id: row.id,
    userId: row.user.id,
    fullName: row.user.fullName,
    email: row.user.email,
    pictureUrl: row.user.pictureUrl,
    status: row.status,
    roleId: role.id,
    roleKey: role.key,
    roleName: role.name,
    departmentName: row.department?.name ?? null,
    locationName: row.location?.name ?? null,
    joinedAt: row.joinedAt,
    updatedAt: row.updatedAt,
  }
}

async function getMembership(
  tx: Prisma.TransactionClient,
  organizationId: string,
  membershipId: string,
): Promise<MembershipRow> {
  const membership = await tx.membership.findFirst({
    where: { id: membershipId, organizationId },
    include: membershipInclude,
  })
  if (!membership) throw membershipNotFound()
  return membership
}

async function assertAnotherActiveAdministrator(
  tx: Prisma.TransactionClient,
  membership: MembershipRow,
): Promise<void> {
  const isActiveAdmin =
    membership.status === "ACTIVE" &&
    membership.roleAssignment?.deletedAt == null &&
    membership.roleAssignment?.role.key === "ADMIN" &&
    membership.roleAssignment.role.isActive &&
    membership.roleAssignment.role.deletedAt == null
  if (!isActiveAdmin) return

  const otherAdministrators = await tx.membership.count({
    where: {
      id: { not: membership.id },
      organizationId: membership.organizationId,
      status: "ACTIVE",
      user: { isActive: true, deletedAt: null },
      roleAssignment: {
        is: {
          deletedAt: null,
          role: {
            is: {
              organizationId: membership.organizationId,
              key: "ADMIN",
              isActive: true,
              deletedAt: null,
            },
          },
        },
      },
    },
  })
  if (otherAdministrators === 0) {
    throw new AppError({
      kind: "conflict",
      code: "LAST_ACTIVE_ADMIN",
      message:
        "Assign another active administrator before changing this membership.",
    })
  }
}

async function serializable<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 2
      ) {
        continue
      }
      throw error
    }
  }
  throw new Error("Serializable membership transaction retry exhausted")
}

export async function listOrganizationMemberships(): Promise<
  ActionResult<OrganizationMembership[]>
> {
  return withErrorBoundary(async () => {
    const session = await authorize(Actions.memberships.read)
    const rows = await prisma.membership.findMany({
      where: { organizationId: session.activeOrganizationId },
      include: membershipInclude,
      orderBy: [{ status: "asc" }, { user: { fullName: "asc" } }],
    })
    return rows.map(toPublicMembership)
  })
}

export async function listOrganizationRoles(): Promise<
  ActionResult<OrganizationRoleOption[]>
> {
  return withErrorBoundary(async () => {
    const session = await authorize(Actions.memberships.read)
    const roles = await prisma.organizationRole.findMany({
      where: {
        organizationId: session.activeOrganizationId,
        isActive: true,
        deletedAt: null,
      },
      orderBy: { key: "asc" },
    })
    return roles.map((role) => ({
      id: role.id,
      key: role.key,
      name: role.name,
      permissions: validStoredPermissions(role.permissions),
    }))
  })
}

export async function addMembership(
  input: unknown,
): Promise<ActionResult<OrganizationMembership>> {
  return withErrorBoundary(async () => {
    const session = await authorize(Actions.memberships.write)
    const parsed = addMembershipSchema.parse(input)

    return serializable(async (tx) => {
      const [user, role] = await Promise.all([
        tx.user.findFirst({
          where: {
            email: { equals: parsed.email.trim(), mode: "insensitive" },
            isActive: true,
            deletedAt: null,
          },
          select: { id: true },
        }),
        tx.organizationRole.findFirst({
          where: {
            id: parsed.roleId,
            organizationId: session.activeOrganizationId,
            isActive: true,
            deletedAt: null,
          },
          select: { id: true, key: true },
        }),
      ])
      if (!user) {
        throw new AppError({
          kind: "not_found",
          code: "USER_NOT_FOUND",
          message:
            "No active account uses that email. Create the account first, then add its membership.",
        })
      }
      if (!role) {
        throw new AppError({
          kind: "not_found",
          code: "ORGANIZATION_ROLE_NOT_FOUND",
          message: "That organization role could not be found.",
        })
      }
      const existing = await tx.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: session.activeOrganizationId,
            userId: user.id,
          },
        },
        select: { id: true },
      })
      if (existing) {
        throw new AppError({
          kind: "conflict",
          code: "MEMBERSHIP_EXISTS",
          message: "That account already has a membership in this organization.",
        })
      }

      const membership = await tx.membership.create({
        data: {
          organizationId: session.activeOrganizationId,
          userId: user.id,
          roleAssignment: { create: { roleId: role.id } },
        },
        include: membershipInclude,
      })
      await logActivity(
        {
          userId: session.userId,
          organizationId: session.activeOrganizationId,
          activity: "MEMBERSHIP_ADD",
          activityData: {
            membershipId: membership.id,
            targetUserId: user.id,
            role: role.key,
          },
        },
        tx,
      )
      return toPublicMembership(membership)
    })
  })
}

export async function changeMembershipRole(
  input: unknown,
): Promise<ActionResult<OrganizationMembership>> {
  return withErrorBoundary(async () => {
    const session = await authorize(Actions.memberships.write)
    const parsed = changeMembershipRoleSchema.parse(input)

    return serializable(async (tx) => {
      const [membership, role] = await Promise.all([
        getMembership(
          tx,
          session.activeOrganizationId,
          parsed.membershipId,
        ),
        tx.organizationRole.findFirst({
          where: {
            id: parsed.roleId,
            organizationId: session.activeOrganizationId,
            isActive: true,
            deletedAt: null,
          },
        }),
      ])
      if (!role) {
        throw new AppError({
          kind: "not_found",
          code: "ORGANIZATION_ROLE_NOT_FOUND",
          message: "That organization role could not be found.",
        })
      }
      if (
        membership.roleAssignment?.role.key === "ADMIN" &&
        role.key !== "ADMIN"
      ) {
        await assertAnotherActiveAdministrator(tx, membership)
      }

      await tx.roleAssignment.upsert({
        where: { membershipId: membership.id },
        update: { roleId: role.id, deletedAt: null },
        create: { membershipId: membership.id, roleId: role.id },
      })
      await logActivity(
        {
          userId: session.userId,
          organizationId: session.activeOrganizationId,
          activity: "MEMBERSHIP_ROLE_CHANGE",
          activityData: {
            membershipId: membership.id,
            targetUserId: membership.userId,
            fromRole: membership.roleAssignment?.role.key ?? null,
            toRole: role.key,
          },
        },
        tx,
      )
      return toPublicMembership(
        await getMembership(
          tx,
          session.activeOrganizationId,
          membership.id,
        ),
      )
    })
  })
}

export async function changeMembershipStatus(
  input: unknown,
): Promise<ActionResult<OrganizationMembership>> {
  return withErrorBoundary(async () => {
    const session = await authorize(Actions.memberships.write)
    const parsed = changeMembershipStatusSchema.parse(input)

    return serializable(async (tx) => {
      const membership = await getMembership(
        tx,
        session.activeOrganizationId,
        parsed.membershipId,
      )
      if (membership.status === parsed.status) return toPublicMembership(membership)
      if (parsed.status === "INACTIVE") {
        await assertAnotherActiveAdministrator(tx, membership)
      } else if (!membership.user.isActive || membership.user.deletedAt) {
        throw new AppError({
          kind: "conflict",
          code: "USER_INACTIVE",
          message: "Reactivate the account before activating its membership.",
        })
      }

      const updated = await tx.membership.update({
        where: { id: membership.id },
        data: { status: parsed.status },
        include: membershipInclude,
      })
      await logActivity(
        {
          userId: session.userId,
          organizationId: session.activeOrganizationId,
          activity:
            parsed.status === "ACTIVE"
              ? "MEMBERSHIP_ACTIVATE"
              : "MEMBERSHIP_DEACTIVATE",
          activityData: {
            membershipId: membership.id,
            targetUserId: membership.userId,
          },
        },
        tx,
      )
      return toPublicMembership(updated)
    })
  })
}

export async function removeMembership(
  input: unknown,
): Promise<ActionResult<true>> {
  return withErrorBoundary(async () => {
    const session = await authorize(Actions.memberships.write)
    const parsed = removeMembershipSchema.parse(input)

    return serializable(async (tx) => {
      const membership = await getMembership(
        tx,
        session.activeOrganizationId,
        parsed.membershipId,
      )
      await assertAnotherActiveAdministrator(tx, membership)
      await tx.membership.delete({ where: { id: membership.id } })
      await logActivity(
        {
          userId: session.userId,
          organizationId: session.activeOrganizationId,
          activity: "MEMBERSHIP_REMOVE",
          activityData: {
            membershipId: membership.id,
            targetUserId: membership.userId,
            role: membership.roleAssignment?.role.key ?? null,
          },
        },
        tx,
      )
      return true as const
    })
  })
}
