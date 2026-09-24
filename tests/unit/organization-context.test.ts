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
    const findFirst = vi.fn().mockResolvedValue({ organization })

    await expect(
      findActiveOrganization(
        reader(findFirst),
        "user-1",
        organization.id,
      ),
    ).resolves.toEqual(organization)
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
})
