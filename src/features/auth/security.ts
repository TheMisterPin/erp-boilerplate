import { createHash, randomBytes } from "node:crypto"
export const createPasswordResetToken = () => randomBytes(32).toString("base64url")
export const hashPasswordResetToken = (token: string) => createHash("sha256").update(token).digest("hex")
export const passwordResetExpiry = (now: Date) => new Date(now.getTime() + 60 * 60_000)
