import bcrypt from "bcryptjs"

import { prisma } from "@/lib/db"
import { credentialsMatch } from "@/features/auth/credentials"
import { AppError } from "@/features/errors/server"
import type { Role } from "@/generated/prisma/client"

const SALT_ROUNDS = 10

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export type AuthUser = {
  id: string
  email: string
  role: Role
  fullName: string
  firstName: string
  lastName: string
  pictureUrl: string | null
  isActive: boolean
  isVerified: boolean
  departmentId: string | null
  locationId: string | null
  password: string
  sessionVersion: number
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<AuthUser> {
  const user = await prisma.user.findFirst({
    where: {
      email,
      deletedAt: null,
    },
  })

  const valid = await credentialsMatch(user, password, verifyPassword)
  if (!valid || !user) {
    throw new AppError({
      kind: "auth",
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password.",
    })
  }

  return user
}
