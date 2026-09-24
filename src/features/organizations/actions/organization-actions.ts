"use server"

import type { ActionResult } from "@/features/errors/dto"
import { AppError, withErrorBoundary } from "@/features/errors/server"
import { createSession } from "@/features/auth/utils"
import { requireSession } from "@/features/auth/session"
import { logActivity } from "@/features/logging/server"
import { findActiveOrganization } from "@/features/organizations/context"
import type { OrganizationOption } from "@/features/organizations/types/organization-types"
import { prisma } from "@/lib/db"

export async function listMyOrganizations(): Promise<
  ActionResult<OrganizationOption[]>
> {
  return withErrorBoundary(async () => {
    const session = await requireSession()
    const memberships = await prisma.membership.findMany({
      where: {
        userId: session.userId,
        status: "ACTIVE",
        organization: { status: "ACTIVE" },
        roleAssignment: {
          is: {
            deletedAt: null,
            role: { is: { isActive: true, deletedAt: null } },
          },
        },
      },
      select: {
        organization: { select: { id: true, name: true, slug: true } },
        roleAssignment: { select: { role: { select: { key: true } } } },
      },
      orderBy: { organization: { name: "asc" } },
    })

    return memberships.map((membership) => ({
      ...membership.organization,
      role: membership.roleAssignment!.role.key,
      isCurrent:
        membership.organization.id === session.activeOrganizationId,
    }))
  })
}

export async function switchOrganization(
  organizationId: string,
): Promise<ActionResult<OrganizationOption>> {
  return withErrorBoundary(async () => {
    const session = await requireSession()
    const target = await findActiveOrganization(
      prisma,
      session.userId,
      organizationId,
    )
    if (!target) {
      throw new AppError({
        kind: "not_found",
        code: "ORGANIZATION_NOT_FOUND",
        message: "That organization is not available to your account.",
      })
    }

    await createSession({
      id: session.userId,
      activeOrganizationId: target.id,
      email: session.email,
      role: session.systemRole,
      fullName: session.fullName,
      sessionVersion: session.sessionVersion,
    })

    await logActivity({
      userId: session.userId,
      organizationId: target.id,
      activity: "ORGANIZATION_SWITCH",
      activityData: {
        fromOrganizationId: session.activeOrganizationId,
        toOrganizationId: target.id,
      },
    })

    return {
      id: target.id,
      name: target.name,
      slug: target.slug,
      role: target.role.key,
      isCurrent: true,
    }
  })
}
