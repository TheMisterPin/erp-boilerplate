"use server"

import type { ActionResult } from "@/features/errors/dto"
import { withErrorBoundary } from "@/features/errors/server"
import { Actions } from "@/features/auth/permissions"
import { authorize } from "@/features/auth/session"
import type { UserActivityItem } from "@/features/logging/types/activity-types"
import { prisma } from "@/lib/db"

export async function listActivities(): Promise<
  ActionResult<UserActivityItem[]>
> {
  return withErrorBoundary(async () => {
    const session = await authorize(Actions.logging.read)

    const rows = await prisma.userActivity.findMany({
      where: { organizationId: session.activeOrganizationId },
      include: {
        user: { select: { fullName: true, email: true } },
      },
      orderBy: { timestamp: "desc" },
    })

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      userFullName: row.user.fullName,
      userEmail: row.user.email,
      activity: row.activity,
      activityData: row.activityData ?? null,
      timestamp: row.timestamp,
    }))
  })
}
