import assert from "node:assert/strict"
import { test } from "node:test"

import { resolveCurrentSession } from "../src/features/auth/session-state"
import type { SessionPayload } from "../src/features/auth/utils"

const tokenSession: SessionPayload = {
  userId: "user-1",
  email: "old@example.com",
  role: "ADMIN",
  fullName: "Old Name",
  expires: "2026-01-01T00:01:00.000Z",
  absoluteExpires: "2026-01-01T00:05:00.000Z",
}

test("uses current database identity and role instead of JWT claims", () => {
  const session = resolveCurrentSession(tokenSession, {
    id: "user-1",
    email: "current@example.com",
    role: "USER",
    fullName: "Current Name",
    isActive: true,
    deletedAt: null,
  })

  assert.equal(session?.role, "USER")
  assert.equal(session?.email, "current@example.com")
  assert.equal(session?.fullName, "Current Name")
  assert.equal(session?.absoluteExpires, tokenSession.absoluteExpires)
})

test("rejects a deactivated account", () => {
  const session = resolveCurrentSession(tokenSession, {
    id: "user-1",
    email: "user@example.com",
    role: "USER",
    fullName: "Example User",
    isActive: false,
    deletedAt: null,
  })

  assert.equal(session, null)
})

test("rejects a soft-deleted account", () => {
  const session = resolveCurrentSession(tokenSession, {
    id: "user-1",
    email: "user@example.com",
    role: "USER",
    fullName: "Example User",
    isActive: true,
    deletedAt: new Date("2026-01-01T00:00:00.000Z"),
  })

  assert.equal(session, null)
})

test("rejects a missing account", () => {
  assert.equal(resolveCurrentSession(tokenSession, null), null)
})
