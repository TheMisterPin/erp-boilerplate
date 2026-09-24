import type { Role } from "@/generated/prisma/client"
import type { SessionPayload } from "@/features/auth/utils"

export type CurrentAccountState = {
  id: string
  email: string
  role: Role
  fullName: string
  isActive: boolean
  deletedAt: Date | null
  sessionVersion: number
}

export function resolveCurrentSession(
  session: SessionPayload,
  account: CurrentAccountState | null,
): SessionPayload | null {
  if (!account || !account.isActive || account.deletedAt || account.sessionVersion !== session.sessionVersion) return null

  return {
    ...session,
    userId: account.id,
    email: account.email,
    systemRole: account.role,
    fullName: account.fullName,
  }
}
