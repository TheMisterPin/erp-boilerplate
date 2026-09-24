import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  authenticateUser: vi.fn(),
  createSession: vi.fn(),
  clearSession: vi.fn(),
  getSession: vi.fn(),
  logActivity: vi.fn(),
  check: vi.fn(),
  resetIdentifier: vi.fn(),
}))

vi.mock("next/headers", () => ({ headers: mocks.headers }))
vi.mock("@/features/auth/password", () => ({
  authenticateUser: mocks.authenticateUser,
}))
vi.mock("@/features/auth/utils", () => ({
  createSession: mocks.createSession,
  clearSession: mocks.clearSession,
  getSession: mocks.getSession,
}))
vi.mock("@/features/auth/login-rate-limit", () => ({
  createLoginRateLimitSubject: vi.fn(() => ({ identifierFingerprint: "id" })),
  getLoginClientSource: vi.fn(() => null),
  normalizeLoginIdentifier: vi.fn((value: string) => value.toLowerCase()),
  loginRateLimiter: {
    check: mocks.check,
    recordFailure: vi.fn(),
    resetIdentifier: mocks.resetIdentifier,
  },
}))
vi.mock("@/features/logging/server", () => ({ logActivity: mocks.logActivity }))
vi.mock("@/lib/db", () => ({ prisma: { user: { findFirst: vi.fn() } } }))

import { loginAction, logoutAction } from "@/features/auth/actions/auth-actions"

const user = {
  id: "auth-user",
  email: "user@example.test",
  firstName: "Auth",
  lastName: "User",
  fullName: "Auth User",
  role: "USER" as const,
  pictureUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  isActive: true,
  isVerified: false,
  verifiedAt: null,
  verifiedBy: null,
  password: "hashed",
  departmentId: null,
  locationId: null,
}

describe("auth server actions", () => {
  it("creates a session and audit event after a valid login", async () => {
    mocks.headers.mockResolvedValue(new Headers())
    mocks.check.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 })
    mocks.authenticateUser.mockResolvedValue(user)

    await expect(
      loginAction({ email: "USER@example.test", password: "password123" }),
    ).resolves.toEqual({
      ok: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        pictureUrl: null,
        isActive: true,
        isVerified: false,
        departmentId: null,
        locationId: null,
      },
    })
    expect(mocks.createSession).toHaveBeenCalledWith(user)
    expect(mocks.logActivity).toHaveBeenCalledWith({
      userId: user.id,
      activity: "LOGIN",
    })
  })

  it("records logout activity before clearing a valid session", async () => {
    mocks.getSession.mockResolvedValue({ userId: user.id })

    await expect(logoutAction()).resolves.toEqual({ ok: true, data: true })
    expect(mocks.logActivity).toHaveBeenCalledWith({
      userId: user.id,
      activity: "LOGOUT",
    })
    expect(mocks.clearSession).toHaveBeenCalledOnce()
  })
})
