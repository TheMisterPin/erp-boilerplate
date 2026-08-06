import type { Activity, Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/db"

/**
 * Append a row to the audit trail. Call from server actions / route handlers only.
 * Never import this module from client code.
 * Returns the created activity id so callers can link related records.
 */
export async function logActivity(
  input: {
    userId: string
    activity: Activity
    activityData?: Prisma.InputJsonValue
  },
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<string> {
  const row = await db.userActivity.create({
    data: {
      userId: input.userId,
      activity: input.activity,
      activityData: input.activityData ?? undefined,
    },
    select: { id: true },
  })
  return row.id
}
