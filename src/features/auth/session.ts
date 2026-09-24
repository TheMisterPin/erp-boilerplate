import { AppError } from "@/features/errors/server"
import {
  type AppAction,
  type Permission,
  hasPermission,
  permissionsForRole,
} from "@/features/auth/permissions"
import { getSession, type SessionPayload } from "@/features/auth/utils"
import { resolveCurrentSession } from "@/features/auth/session-state"
import { prisma } from "@/lib/db"
import { findActiveOrganization } from "@/features/organizations/context"

export type AppSession = SessionPayload & {
  role: import("@/generated/prisma/client").OrganizationRoleKey
  permissions: Permission[]
  organization: {
    id: string
    name: string
    slug: string
  }
}

export { hasPermission, permissionsForRole }

export async function requireSession(): Promise<AppSession> {
  const tokenSession = await getSession()
  if (!tokenSession) {
    throw new AppError({
      kind: "auth",
      code: "SESSION_EXPIRED",
      message: "Your session has expired. Please sign in again.",
    })
  }

  const account = await prisma.user.findUnique({
    where: { id: tokenSession.userId },
    select: {
      id: true,
      email: true,
      role: true,
      fullName: true,
      isActive: true,
      deletedAt: true,
      sessionVersion: true,
    },
  })
  const session = resolveCurrentSession(tokenSession, account)

  if (!session) {
    throw new AppError({
      kind: "auth",
      code: "SESSION_EXPIRED",
      message: "Your session has expired. Please sign in again.",
    })
  }

  const organization = await findActiveOrganization(
    prisma,
    session.userId,
    session.activeOrganizationId,
  )
  if (!organization) {
    throw new AppError({
      kind: "auth",
      code: "ORGANIZATION_ACCESS_REVOKED",
      message: "Your organization access is no longer active.",
    })
  }

  return {
    ...session,
    role: organization.role.key,
    permissions: organization.role.permissions,
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    },
  }
}

/** Universal RBAC gate — the current database role must hold the permission. */
export async function authorize(action: AppAction): Promise<AppSession> {
  const session = await requireSession()
  if (!session.permissions.includes(action.permission)) {
    throw new AppError({
      kind: "permission",
      code: "FORBIDDEN",
      message: "You do not have permission to perform this action.",
    })
  }
  return session
}

/** @deprecated Prefer `authorize(Actions.*)`. */
export async function requirePermission(
  permission: Permission,
): Promise<AppSession> {
  return authorize({ id: permission, permission })
}
