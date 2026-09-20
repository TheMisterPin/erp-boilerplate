import assert from "node:assert/strict"
import { test } from "node:test"

import {
  createSessionDates,
  getSessionCookieOptions,
  refreshSessionIdleExpiry,
} from "../src/features/auth/session-policy"
import { validateJwtSecret } from "../src/lib/env"

test("creates idle and absolute expiries from the same start time", () => {
  const now = new Date("2026-01-01T00:00:00.000Z")
  const dates = createSessionDates(now, 60, 300)

  assert.equal(dates.idleExpires.toISOString(), "2026-01-01T00:01:00.000Z")
  assert.equal(
    dates.absoluteExpires.toISOString(),
    "2026-01-01T00:05:00.000Z",
  )
})

test("caps a rolling idle refresh at the absolute expiry", () => {
  const now = new Date("2026-01-01T00:04:30.000Z")
  const absoluteExpires = new Date("2026-01-01T00:05:00.000Z")

  assert.equal(
    refreshSessionIdleExpiry(now, 60, absoluteExpires)?.toISOString(),
    absoluteExpires.toISOString(),
  )
})

test("does not refresh an expired absolute lifetime", () => {
  const now = new Date("2026-01-01T00:05:00.000Z")
  const absoluteExpires = new Date("2026-01-01T00:05:00.000Z")

  assert.equal(refreshSessionIdleExpiry(now, 60, absoluteExpires), null)
})

test("sets Secure only for production cookies", () => {
  const expires = new Date("2026-01-01T00:05:00.000Z")

  assert.equal(getSessionCookieOptions(expires, true).secure, true)
  assert.equal(getSessionCookieOptions(expires, false).secure, false)
  assert.equal(getSessionCookieOptions(expires, true).httpOnly, true)
  assert.equal(getSessionCookieOptions(expires, true).sameSite, "lax")
})

test("rejects short JWT secrets in production", () => {
  assert.throws(
    () => validateJwtSecret("too-short", "production"),
    /at least 32 characters/,
  )
  assert.equal(validateJwtSecret("too-short", "development"), "too-short")
  assert.equal(
    validateJwtSecret("a-secure-production-secret-with-32-chars", "production"),
    "a-secure-production-secret-with-32-chars",
  )
})
