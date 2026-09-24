import { z } from "zod"
import { userEmailSchema, userPasswordSchema } from "@/lib/schemas/user"
const confirmation = (shape: Record<string, z.ZodTypeAny>) => z.object(shape).refine((v) => v.newPassword === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" })
export const changePasswordSchema = confirmation({ currentPassword: z.string().min(1, "Current password is required"), newPassword: userPasswordSchema, confirmPassword: z.string().min(1, "Confirm your new password") })
export const requestPasswordResetSchema = z.object({ email: userEmailSchema })
export const resetPasswordSchema = confirmation({ token: z.string().min(1, "Reset token is required"), newPassword: userPasswordSchema, confirmPassword: z.string().min(1, "Confirm your new password") })
