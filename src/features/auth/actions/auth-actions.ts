"use server"

import { headers } from "next/headers"

import { prisma } from "@/lib/db"
import type { ActionResult } from "@/features/errors/dto"
import { AppError, withErrorBoundary } from "@/features/errors/server"
import { authenticateUser } from "@/features/auth/password"
import {
  createLoginRateLimitSubject,
  getLoginClientSource,
  loginRateLimiter,
  normalizeLoginIdentifier,
  type LoginRateLimitDecision,
  type LoginRateLimitSubject,
} from "@/features/auth/login-rate-limit"
import {
  createSession,
  clearSession,
  getSession,
} from "@/features/auth/utils"
import { toMe, type Me } from "@/features/auth/types"
import { logActivity } from "@/features/logging/server"
import { findActiveOrganization } from "@/features/organizations/context"

function throwLoginRateLimited(
  subject: LoginRateLimitSubject,
  decision: LoginRateLimitDecision,
): never {
  console.warn("[auth.login_throttled]", {
    identifierFingerprint: subject.identifierFingerprint,
    sourceFingerprint: subject.sourceFingerprint,
    retryAfterSeconds: decision.retryAfterSeconds,
  })

  throw new AppError({
    kind: "auth",
    code: "LOGIN_RATE_LIMITED",
    message: "Too many sign-in attempts. Please try again later.",
  })
}

function isInvalidCredentialsError(error: unknown): boolean {
  return (
    error instanceof AppError && error.dto.code === "INVALID_CREDENTIALS"
  )
}

export async function loginAction(
  input: unknown,
): Promise<ActionResult<Me>> {
  return withErrorBoundary(async () => {
    const body =
      typeof input === "object" && input !== null
        ? (input as { email?: unknown; password?: unknown })
        : {}
    const email =
      typeof body.email === "string"
        ? normalizeLoginIdentifier(body.email)
        : ""
    const password = typeof body.password === "string" ? body.password : ""

    if (!email || !password) {
      throw new AppError({
        kind: "validation",
        code: "INVALID_INPUT",
        message: "Email and password are required.",
      })
    }

    const requestHeaders = await headers()
    const subject = createLoginRateLimitSubject(
      email,
      getLoginClientSource(requestHeaders),
    )
    const currentLimit = await loginRateLimiter.check(subject)
    if (!currentLimit.allowed) {
      throwLoginRateLimited(subject, currentLimit)
    }

    let user: Awaited<ReturnType<typeof authenticateUser>>
    try {
      user = await authenticateUser(email, password)
    } catch (error) {
      if (isInvalidCredentialsError(error)) {
        const nextLimit = await loginRateLimiter.recordFailure(subject)
        if (!nextLimit.allowed) {
          throwLoginRateLimited(subject, nextLimit)
        }
      }
      throw error
    }

    await loginRateLimiter.resetIdentifier(subject)
    const organization = await findActiveOrganization(prisma, user.id)
    if (!organization) {
      throw new AppError({
        kind: "auth",
        code: "NO_ACTIVE_ORGANIZATION",
        message: "Your account does not have access to an active organization.",
      })
    }
    await createSession({
      ...user,
      activeOrganizationId: organization.id,
    })

    await logActivity({
      userId: user.id,
      organizationId: organization.id,
      activity: "LOGIN",
    })

    return toMe(user, organization.role.key, organization)
  })
}

export async function logoutAction(): Promise<ActionResult<true>> {
  return withErrorBoundary(async () => {
    const session = await getSession()
    if (session) {
      await logActivity({
        userId: session.userId,
        organizationId: session.activeOrganizationId,
        activity: "LOGOUT",
      })
    }
    await clearSession()
    return true as const
  })
}

export async function getMeAction(): Promise<ActionResult<Me | null>> {
  return withErrorBoundary(async () => {
    const session = await getSession()
    if (!session) return null

    const user = await prisma.user.findFirst({
      where: {
        id: session.userId,
        deletedAt: null,
        isActive: true,
      },
    })

    if (!user) {
      await clearSession()
      return null
    }
    if (session.sessionVersion !== user.sessionVersion) {
      await clearSession()
      return null
    }
    const organization = await findActiveOrganization(
      prisma,
      user.id,
      session.activeOrganizationId,
    )
    if (!organization) {
      await clearSession()
      return null
    }

    return toMe(user, organization.role.key, organization)
  })
}
