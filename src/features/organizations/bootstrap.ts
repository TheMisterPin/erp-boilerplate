import type { PrismaClient } from "@/generated/prisma/client"

import { ROLE_PERMISSIONS } from "@/features/auth/permissions"

type OrganizationBootstrapDatabase = Pick<PrismaClient, "$transaction">

/** Atomically creates an organization, its role catalog, and its first admin. */
export async function bootstrapOrganization(
  db: OrganizationBootstrapDatabase,
  input: { name: string; slug: string; administratorUserId: string },
) {
  return db.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: input.name, slug: input.slug },
    })

    await tx.organizationRole.createMany({
      data: Object.entries(ROLE_PERMISSIONS).map(([key, permissions]) => ({
        organizationId: organization.id,
        key: key as keyof typeof ROLE_PERMISSIONS,
        name: key.charAt(0) + key.slice(1).toLowerCase(),
        permissions: [...permissions],
      })),
    })
    const adminRole = await tx.organizationRole.findUniqueOrThrow({
      where: {
        organizationId_key: {
          organizationId: organization.id,
          key: "ADMIN",
        },
      },
    })
    const membership = await tx.membership.create({
      data: {
        organizationId: organization.id,
        userId: input.administratorUserId,
        roleAssignment: { create: { roleId: adminRole.id } },
      },
    })

    return { organization, membership }
  })
}
