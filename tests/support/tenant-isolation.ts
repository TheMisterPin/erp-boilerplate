import type { AppSession } from "@/features/auth/session"
import type { PrismaClient } from "@/generated/prisma/client"
import { expect } from "vitest"

type TenantRole = "ADMIN" | "MANAGER" | "OPERATOR" | "VIEWER"

export type TenantFixture = {
  organizationId: string
  userId: string
  membershipId: string
  role: TenantRole
  session: AppSession
}

/**
 * Creates a tenant fixture whose organization shares a display name with the
 * other tenant used by the isolation matrix. Slugs remain unique by design.
 */
export async function createTenantFixture(
  prisma: PrismaClient,
  input: { email: string; slug: string; role?: TenantRole },
): Promise<TenantFixture> {
  const role = input.role ?? "ADMIN"
  const organization = await prisma.organization.create({
    data: { name: "Shared Operations", slug: input.slug },
  })
  const organizationRole = await prisma.organizationRole.create({
    data: {
      organizationId: organization.id,
      key: role,
      name: role,
      permissions: [],
    },
  })
  const user = await prisma.user.create({
    data: {
      email: input.email,
      firstName: input.slug,
      lastName: "Administrator",
      fullName: `${input.slug} Administrator`,
      password: "not-a-real-password",
      role: "ADMIN",
    },
  })
  const membership = await prisma.membership.create({
    data: {
      organizationId: organization.id,
      userId: user.id,
      roleAssignment: { create: { roleId: organizationRole.id } },
    },
  })

  return {
    organizationId: organization.id,
    userId: user.id,
    membershipId: membership.id,
    role,
    session: {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      systemRole: user.role,
      sessionVersion: user.sessionVersion,
      activeOrganizationId: organization.id,
      role,
      permissions: [],
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
      expires: "2030-01-01T00:00:00.000Z",
      absoluteExpires: "2030-02-01T00:00:00.000Z",
    },
  }
}

export async function expectIsolationError(
  result: Promise<unknown>,
  code: string,
): Promise<void> {
  await expect(result).resolves.toMatchObject({
    ok: false,
    error: { code },
  })
}
