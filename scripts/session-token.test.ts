import assert from "node:assert/strict"
import { afterEach, beforeEach, test } from "node:test"

import { decrypt, encrypt } from "../src/features/auth/utils"

const ORIGINAL_ENV = { ...process.env }
const JWT_SECRET = "test-session-secret-that-is-longer-than-32-characters"

beforeEach(() => {
  process.env.JWT_SECRET = JWT_SECRET
  process.env.SESSION_JWT_ISSUER = "test-issuer"
  process.env.SESSION_JWT_AUDIENCE = "test-audience"
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

test("round-trips a session with issuer and audience validation", async () => {
  const token = await encrypt(
    {
      userId: "user-1",
      activeOrganizationId: "organization-1",
      email: "user@example.com",
      systemRole: "USER",
      fullName: "Example User",
      sessionVersion: 1,
    },
    {
      idleExpires: new Date(Date.now() + 60_000),
      absoluteExpires: new Date(Date.now() + 300_000),
    },
  )

  const session = await decrypt(token)

  assert.equal(session?.userId, "user-1")
  assert.equal(session?.systemRole, "USER")
})

test("rejects a token issued for a different audience", async () => {
  const token = await encrypt(
    {
      userId: "user-1",
      activeOrganizationId: "organization-1",
      email: "user@example.com",
      systemRole: "USER",
      fullName: "Example User",
      sessionVersion: 1,
    },
    {
      idleExpires: new Date(Date.now() + 60_000),
      absoluteExpires: new Date(Date.now() + 300_000),
    },
  )

  process.env.SESSION_JWT_AUDIENCE = "another-audience"

  assert.equal(await decrypt(token), null)
})

test("rejects a token issued by a different issuer", async () => {
  const token = await encrypt(
    {
      userId: "user-1",
      activeOrganizationId: "organization-1",
      email: "user@example.com",
      systemRole: "USER",
      fullName: "Example User",
      sessionVersion: 1,
    },
    {
      idleExpires: new Date(Date.now() + 60_000),
      absoluteExpires: new Date(Date.now() + 300_000),
    },
  )

  process.env.SESSION_JWT_ISSUER = "another-issuer"

  assert.equal(await decrypt(token), null)
})

test("rejects a token whose signature was modified", async () => {
  const token = await encrypt(
    {
      userId: "user-1",
      activeOrganizationId: "organization-1",
      email: "user@example.com",
      systemRole: "USER",
      fullName: "Example User",
      sessionVersion: 1,
    },
    {
      idleExpires: new Date(Date.now() + 60_000),
      absoluteExpires: new Date(Date.now() + 300_000),
    },
  )

  const tokenParts = token.split(".")
  const signature = tokenParts[2]
  const forgedSignature = `${signature.startsWith("a") ? "b" : "a"}${signature.slice(1)}`
  const forgedToken = [...tokenParts.slice(0, 2), forgedSignature].join(".")

  assert.equal(await decrypt(forgedToken), null)
})

test("rejects a malformed token", async () => {
  assert.equal(await decrypt("not.a.jwt"), null)
})

test("rejects a token beyond its absolute lifetime", async () => {
  const token = await encrypt(
    {
      userId: "user-1",
      activeOrganizationId: "organization-1",
      email: "user@example.com",
      systemRole: "USER",
      fullName: "Example User",
      sessionVersion: 1,
    },
    {
      idleExpires: new Date(Date.now() + 60_000),
      absoluteExpires: new Date(Date.now() - 1_000),
    },
  )

  assert.equal(await decrypt(token), null)
})
