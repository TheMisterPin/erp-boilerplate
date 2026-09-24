"use server"
import { prisma } from "@/lib/db"
import { changePasswordSchema, requestPasswordResetSchema, resetPasswordSchema } from "@/lib/schemas/auth-security"
import { normalizeLoginIdentifier } from "@/features/auth/login-rate-limit"
import { hashPassword, verifyPassword } from "@/features/auth/password"
import { passwordResetDelivery } from "@/features/auth/password-reset-delivery"
import { createPasswordResetToken, hashPasswordResetToken, passwordResetExpiry } from "@/features/auth/security"
import { requireSession } from "@/features/auth/session"
import { clearSession, createSession } from "@/features/auth/utils"
import type { ActionResult } from "@/features/errors/dto"
import { AppError, withErrorBoundary } from "@/features/errors/server"
import { logActivity } from "@/features/logging/server"

const invalidReset = () => new AppError({ kind: "auth", code: "INVALID_RESET_TOKEN", message: "This password-reset link is invalid or has expired." })

export async function changePasswordAction(input: unknown): Promise<ActionResult<true>> {
 return withErrorBoundary(async () => { const session = await requireSession(); const data = changePasswordSchema.parse(input); const user = await prisma.user.findFirst({ where: { id: session.userId, deletedAt: null, isActive: true }, select: { id: true, password: true, email: true, role: true, fullName: true } }); if (!user || !(await verifyPassword(data.currentPassword, user.password))) throw new AppError({ kind: "auth", code: "INVALID_CURRENT_PASSWORD", message: "Your current password is incorrect." }); const password = await hashPassword(data.newPassword); const fresh = await prisma.$transaction(async tx => { const row = await tx.user.update({ where: { id: user.id }, data: { password, sessionVersion: { increment: 1 } }, select: { id: true, email: true, role: true, fullName: true, sessionVersion: true } }); await tx.passwordResetToken.deleteMany({ where: { userId: user.id } }); await logActivity({ userId: user.id, organizationId: session.activeOrganizationId, activity: "PASSWORD_CHANGE" }, tx); return row }); await createSession({ ...fresh, activeOrganizationId: session.activeOrganizationId }); return true as const })
}
export async function requestPasswordResetAction(input: unknown): Promise<ActionResult<true>> {
 return withErrorBoundary(async () => { const { email } = requestPasswordResetSchema.parse(input); const user = await prisma.user.findFirst({ where: { email: normalizeLoginIdentifier(email), deletedAt: null, isActive: true }, select: { id: true, email: true } }); if (!user) return true as const; const token = createPasswordResetToken(), expiresAt = passwordResetExpiry(new Date()); await prisma.$transaction(async tx => { await tx.passwordResetToken.deleteMany({ where: { userId: user.id } }); await tx.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashPasswordResetToken(token), expiresAt } }) }); await passwordResetDelivery.send({ email: user.email, token, expiresAt }); return true as const })
}
export async function resetPasswordAction(input: unknown): Promise<ActionResult<true>> {
 return withErrorBoundary(async () => { const data = resetPasswordSchema.parse(input), now = new Date(), tokenHash = hashPasswordResetToken(data.token), password = await hashPassword(data.newPassword); await prisma.$transaction(async tx => { const reset = await tx.passwordResetToken.findFirst({ where: { tokenHash, usedAt: null, expiresAt: { gt: now } }, select: { id: true, userId: true, user: { select: { isActive: true, deletedAt: true, memberships: { where: { status: "ACTIVE", organization: { status: "ACTIVE" } }, orderBy: { joinedAt: "asc" }, take: 1, select: { organizationId: true } } } } } }); const organizationId = reset?.user.memberships[0]?.organizationId; if (!reset || !reset.user.isActive || reset.user.deletedAt || !organizationId) throw invalidReset(); const consumed = await tx.passwordResetToken.updateMany({ where: { id: reset.id, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } }); if (consumed.count !== 1) throw invalidReset(); await tx.user.update({ where: { id: reset.userId }, data: { password, sessionVersion: { increment: 1 } } }); await tx.passwordResetToken.deleteMany({ where: { userId: reset.userId, id: { not: reset.id } } }); await logActivity({ userId: reset.userId, organizationId, activity: "PASSWORD_RESET" }, tx) }); await clearSession(); return true as const })
}
export async function revokeSessionsAction(): Promise<ActionResult<true>> { return withErrorBoundary(async () => { const session = await requireSession(); await prisma.$transaction(async tx => { await tx.user.update({ where: { id: session.userId }, data: { sessionVersion: { increment: 1 } } }); await tx.passwordResetToken.deleteMany({ where: { userId: session.userId } }); await logActivity({ userId: session.userId, organizationId: session.activeOrganizationId, activity: "SESSION_REVOKED" }, tx) }); await clearSession(); return true as const }) }
