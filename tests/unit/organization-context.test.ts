import { describe, expect, it, vi } from "vitest"

import { findActiveOrganization } from "@/features/organizations/context"
import type { PrismaClient } from "@/generated/prisma/client"

function reader(findFirst: ReturnType<typeof vi.fn>) {
  return {
    membership: { findFirst },
  } as unknown as Pick<PrismaClient, "membership">
}

describe("organization request context", () => {
  it("returns an active organization from an active membership", async () => {
    const organization = {
      id: "organization-1",
      name: "Example Organization",
      slug: "example",
    }
    const findFirst = vi.fn().mockResolvedValue({
      id: "membership-1",
      departmentId: null,
      locationId: null,
      organization,
      roleAssignment: {
        deletedAt: null,
        role: {
          key: "OPERATOR",
          permissions: ["users:read", "unknown:grant"],
          isActive: true,
          deletedAt: null,
          organizationId: organization.id,
        },
      },
    })

    await expect(
      findActiveOrganization(
        reader(findFirst),
        "user-1",
        organization.id,
      ),
    ).resolves.toEqual({
      ...organization,
      membershipId: "membership-1",
      departmentId: null,
      locationId: null,
      role: { key: "OPERATOR", permissions: ["users:read"] },
    })
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-1",
          status: "ACTIVE",
          organization: { status: "ACTIVE", id: organization.id },
        },
      }),
    )
  })

  it("returns null when no active membership is available", async () => {
    const findFirst = vi.fn().mockResolvedValue(null)

    await expect(
      findActiveOrganization(reader(findFirst), "user-1"),
    ).resolves.toBeNull()
  })

  it("returns null for a deleted role assignment", async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: "membership-1",
      departmentId: null,
      locationId: null,
      organization: {
        id: "organization-1",
        name: "Example",
        slug: "example",
      },
      roleAssignment: {
        deletedAt: new Date(),
        role: {
          key: "ADMIN",
          permissions: ["users:write"],
          isActive: true,
          deletedAt: null,
          organizationId: "organization-1",
        },
      },
    })

    await expect(
      findActiveOrganization(reader(findFirst), "user-1"),
    ).resolves.toBeNull()
  })
})
