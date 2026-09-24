import { SignJWT, jwtVerify, type JWTPayload } from "jose"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import {
  getJwtSecret,
  getSessionAbsoluteMaxAgeSeconds,
  getSessionIdleMaxAgeSeconds,
  getSessionJwtAudience,
  getSessionJwtIssuer,
} from "@/lib/env"
import type { Role } from "@/generated/prisma/client"
import {
  createSessionDates,
  getSessionCookieOptions,
  refreshSessionIdleExpiry,
} from "@/features/auth/session-policy"

export const SESSION_COOKIE = "session"

export type SessionPayload = {
  userId: string
  activeOrganizationId: string
  email: string
  role: Role
  fullName: string
  sessionVersion: number
  expires: string
  absoluteExpires: string
}

type SessionJWTPayload = JWTPayload & {
  userId: string
  activeOrganizationId: string
  email: string
  role: Role
  fullName: string
  sessionVersion: number
  expires: string
  absoluteExpires: string
}

function getKey() {
  return new TextEncoder().encode(getJwtSecret())
}

export async function encrypt(
  payload: Omit<SessionPayload, "expires" | "absoluteExpires">,
  dates: { idleExpires: Date; absoluteExpires: Date },
): Promise<string> {
  return await new SignJWT({
    userId: payload.userId,
    activeOrganizationId: payload.activeOrganizationId,
    email: payload.email,
    role: payload.role,
    fullName: payload.fullName,
    sessionVersion: payload.sessionVersion,
    expires: dates.idleExpires.toISOString(),
    absoluteExpires: dates.absoluteExpires.toISOString(),
  } satisfies Omit<SessionJWTPayload, keyof JWTPayload>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(getSessionJwtIssuer())
    .setAudience(getSessionJwtAudience())
    .setExpirationTime(dates.idleExpires)
    .sign(getKey())
}

export async function decrypt(input: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(input, getKey(), {
      algorithms: ["HS256"],
      issuer: getSessionJwtIssuer(),
      audience: getSessionJwtAudience(),
    })
    const data = payload as SessionJWTPayload
    if (
      typeof data.userId !== "string" ||
      typeof data.activeOrganizationId !== "string" ||
      typeof data.email !== "string" ||
      typeof data.role !== "string" ||
      typeof data.fullName !== "string" ||
      typeof data.sessionVersion !== "number" ||
      !Number.isSafeInteger(data.sessionVersion) ||
      typeof data.expires !== "string" ||
      typeof data.absoluteExpires !== "string"
    ) {
      return null
    }
    const absoluteExpires = new Date(data.absoluteExpires)
    if (
      !Number.isFinite(absoluteExpires.getTime()) ||
      absoluteExpires.getTime() <= Date.now()
    ) {
      return null
    }
    return {
      userId: data.userId,
      activeOrganizationId: data.activeOrganizationId,
      email: data.email,
      role: data.role,
      fullName: data.fullName,
      sessionVersion: data.sessionVersion,
      expires: data.expires,
      absoluteExpires: data.absoluteExpires,
    }
  } catch {
    return null
  }
}

export async function createSession(user: {
  id: string
  activeOrganizationId: string
  email: string
  role: Role
  fullName: string
  sessionVersion: number
}): Promise<void> {
  const dates = createSessionDates(
    new Date(),
    getSessionIdleMaxAgeSeconds(),
    getSessionAbsoluteMaxAgeSeconds(),
  )
  const session = await encrypt(
    {
      userId: user.id,
      activeOrganizationId: user.activeOrganizationId,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      sessionVersion: user.sessionVersion,
    },
    dates,
  )
  const cookieStore = await cookies()
  cookieStore.set(
    SESSION_COOKIE,
    session,
    getSessionCookieOptions(
      dates.idleExpires,
      process.env.NODE_ENV === "production",
    ),
  )
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, "", {
    expires: new Date(0),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const session = cookieStore.get(SESSION_COOKIE)?.value
  if (!session) return null
  return await decrypt(session)
}

export async function updateSession(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)?.value
  if (!session) return NextResponse.next()

  const parsed = await decrypt(session)
  if (!parsed) return NextResponse.next()

  const absoluteExpires = new Date(parsed.absoluteExpires)
  const idleExpires = refreshSessionIdleExpiry(
    new Date(),
    getSessionIdleMaxAgeSeconds(),
    absoluteExpires,
  )
  if (!idleExpires) return NextResponse.next()

  const res = NextResponse.next()
  res.cookies.set({
    name: SESSION_COOKIE,
    value: await encrypt(
      {
        userId: parsed.userId,
        activeOrganizationId: parsed.activeOrganizationId,
        email: parsed.email,
        role: parsed.role,
        fullName: parsed.fullName,
        sessionVersion: parsed.sessionVersion,
      },
      { idleExpires, absoluteExpires },
    ),
    ...getSessionCookieOptions(
      idleExpires,
      process.env.NODE_ENV === "production",
    ),
  })
  return res
}
