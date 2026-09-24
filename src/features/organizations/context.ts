import type { PrismaClient } from "@/generated/prisma/client"
import { validStoredPermissions, type Permission } from "@/features/auth/permissions"
import type { OrganizationRoleKey } from "@/generated/prisma/client"

type OrganizationReader = Pick<PrismaClient, "membership">

export type ActiveOrganization = {
  id: string
  name: string
  slug: string
  membershipId: string
  role: {
    key: OrganizationRoleKey
    permissions: Permission[]
  }
}

export async function findActiveOrganization(
  db: OrganizationReader,
  userId: string,
  preferredOrganizationId?: string,
): Promise<ActiveOrganization | null> {
  const membership = await db.membership.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      organization: {
        status: "ACTIVE",
        ...(preferredOrganizationId ? { id: preferredOrganizationId } : {}),
      },
    },
    orderBy: [{ joinedAt: "asc" }, { organizationId: "asc" }],
    select: {
      id: true,
      organization: {
        select: { id: true, name: true, slug: true },
      },
      roleAssignment: {
        select: {
          deletedAt: true,
          role: {
            select: {
              key: true,
              permissions: true,
              isActive: true,
              deletedAt: true,
              organizationId: true,
            },
          },
        },
      },
    },
  })

  const assignment = membership?.roleAssignment
  const role = assignment?.role
  if (
    !membership ||
    !assignment ||
    assignment.deletedAt ||
    !role ||
    !role.isActive ||
    role.deletedAt ||
    role.organizationId !== membership.organization.id
  ) {
    return null
  }

  return {
    ...membership.organization,
    membershipId: membership.id,
    role: {
      key: role.key,
      permissions: validStoredPermissions(role.permissions),
    },
  }
}
