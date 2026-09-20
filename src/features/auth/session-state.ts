import type { Role } from "@/generated/prisma/client"
import type { SessionPayload } from "@/features/auth/utils"

export type CurrentAccountState = {
  id: string
  email: string
  role: Role
  fullName: string
  isActive: boolean
  deletedAt: Date | null
}

export function resolveCurrentSession(
  session: SessionPayload,
  account: CurrentAccountState | null,
): SessionPayload | null {
  if (!account || !account.isActive || account.deletedAt) return null

  return {
    ...session,
    userId: account.id,
    email: account.email,
    role: account.role,
    fullName: account.fullName,
  }
}
