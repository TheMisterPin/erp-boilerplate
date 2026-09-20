export type SessionDates = {
  idleExpires: Date
  absoluteExpires: Date
}

export function createSessionDates(
  now: Date,
  idleMaxAgeSeconds: number,
  absoluteMaxAgeSeconds: number,
): SessionDates {
  const absoluteExpires = new Date(
    now.getTime() + absoluteMaxAgeSeconds * 1000,
  )
  const idleExpires = new Date(
    Math.min(
      now.getTime() + idleMaxAgeSeconds * 1000,
      absoluteExpires.getTime(),
    ),
  )

  return { idleExpires, absoluteExpires }
}

export function refreshSessionIdleExpiry(
  now: Date,
  idleMaxAgeSeconds: number,
  absoluteExpires: Date,
): Date | null {
  if (
    !Number.isFinite(absoluteExpires.getTime()) ||
    absoluteExpires.getTime() <= now.getTime()
  ) {
    return null
  }

  return new Date(
    Math.min(
      now.getTime() + idleMaxAgeSeconds * 1000,
      absoluteExpires.getTime(),
    ),
  )
}

export function getSessionCookieOptions(
  expires: Date,
  isProduction: boolean,
) {
  return {
    expires,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction,
    path: "/",
  }
}
