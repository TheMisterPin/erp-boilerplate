import type { AppSession } from "@/features/auth/session"
import { AppError } from "@/features/errors/server"
import { listManagedLocationIds } from "@/features/shifts/actions/shift-access"

/** ADMIN always; otherwise cannot self-review and must manage the requester. */
export async function assertCanReviewTimeOff(
  session: AppSession,
  requesterUserId: string,
  requesterLocationId: string | null,
): Promise<void> {
  if (session.role === "ADMIN") return
  if (session.userId === requesterUserId || !requesterLocationId) {
    throw new AppError({
      kind: "permission",
      code: "FORBIDDEN",
      message: "You do not have permission to review that request.",
    })
  }
  const managed = await listManagedLocationIds(session)
  if (!managed.includes(requesterLocationId)) {
    throw new AppError({
      kind: "permission",
      code: "FORBIDDEN",
      message: "You do not have permission to review that request.",
    })
  }
}

export async function canReviewTimeOff(
  session: AppSession,
  requesterUserId: string,
  requesterLocationId: string | null,
): Promise<boolean> {
  if (session.role === "ADMIN") return true
  if (session.userId === requesterUserId || !requesterLocationId) return false
  const managed = await listManagedLocationIds(session)
  return managed.includes(requesterLocationId)
}
