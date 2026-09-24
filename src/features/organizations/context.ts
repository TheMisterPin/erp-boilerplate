import type { PrismaClient } from "@/generated/prisma/client"

type OrganizationReader = Pick<PrismaClient, "membership">

export type ActiveOrganization = {
  id: string
  name: string
  slug: string
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
      organization: {
        select: { id: true, name: true, slug: true },
      },
    },
  })

  return membership?.organization ?? null
}
