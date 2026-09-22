import assert from "node:assert/strict"
import { test } from "node:test"
import bcrypt from "bcryptjs"

import {
  credentialsMatch,
  DUMMY_PASSWORD_HASH,
} from "../src/features/auth/credentials"
import {
  createLoginRateLimitSubject,
  getLoginClientSource,
  InMemoryLoginRateLimiter,
} from "../src/features/auth/login-rate-limit"

function createLimiter(now: () => number) {
  return new InMemoryLoginRateLimiter({
    identifierMaxAttempts: 3,
    sourceMaxAttempts: 10,
    windowMs: 60_000,
    now,
  })
}

test("throttles at the configured failed-attempt threshold", async () => {
  const limiter = createLimiter(() => 0)
  const subject = createLoginRateLimitSubject(
    " User@Example.com ",
    "203.0.113.10",
  )

  assert.equal((await limiter.recordFailure(subject)).allowed, true)
  assert.equal((await limiter.recordFailure(subject)).allowed, true)

  const threshold = await limiter.recordFailure(subject)
  assert.equal(threshold.allowed, false)
  assert.equal(threshold.retryAfterSeconds, 60)
  assert.equal((await limiter.check(subject)).allowed, false)
})

test("expires failed-attempt counters after the configured window", async () => {
  let now = 0
  const limiter = createLimiter(() => now)
  const subject = createLoginRateLimitSubject("user@example.com")

  await limiter.recordFailure(subject)
  await limiter.recordFailure(subject)
  await limiter.recordFailure(subject)
  assert.equal((await limiter.check(subject)).allowed, false)

  now = 60_000
  assert.equal((await limiter.check(subject)).allowed, true)
})

test("a successful login reset clears relevant failure state", async () => {
  const limiter = createLimiter(() => 0)
  const subject = createLoginRateLimitSubject(
    "user@example.com",
    "203.0.113.10",
  )

  await limiter.recordFailure(subject)
  await limiter.recordFailure(subject)
  await limiter.resetIdentifier(subject)

  assert.equal((await limiter.recordFailure(subject)).allowed, true)
  assert.equal((await limiter.recordFailure(subject)).allowed, true)
  assert.equal((await limiter.recordFailure(subject)).allowed, false)
})

test("limits repeated failures from one client source across identifiers", async () => {
  const limiter = new InMemoryLoginRateLimiter({
    identifierMaxAttempts: 10,
    sourceMaxAttempts: 2,
    windowMs: 60_000,
    now: () => 0,
  })
  const first = createLoginRateLimitSubject("one@example.com", "203.0.113.10")
  const second = createLoginRateLimitSubject("two@example.com", "203.0.113.10")

  assert.equal((await limiter.recordFailure(first)).allowed, true)
  assert.equal((await limiter.recordFailure(second)).allowed, false)
})

test("stores fingerprints instead of raw identifiers and sources", () => {
  const subject = createLoginRateLimitSubject(
    "User@Example.com",
    "203.0.113.10",
  )
  const serialized = JSON.stringify(subject)

  assert.equal(serialized.includes("user@example.com"), false)
  assert.equal(serialized.includes("203.0.113.10"), false)
  assert.equal(
    subject.identifierFingerprint,
    createLoginRateLimitSubject(" user@example.com ").identifierFingerprint,
  )
})

test("derives a client source from proxy headers", () => {
  const requestHeaders = new Headers({
    "x-forwarded-for": "203.0.113.10, 198.51.100.4",
    "x-real-ip": "192.0.2.1",
  })

  assert.equal(getLoginClientSource(requestHeaders), "203.0.113.10")
  assert.equal(getLoginClientSource(new Headers()), null)
})

test("unknown accounts and wrong passwords both perform one comparison", async () => {
  const comparedHashes: string[] = []
  const verify = async (_password: string, hash: string) => {
    comparedHashes.push(hash)
    return false
  }

  assert.equal(await credentialsMatch(null, "wrong", verify), false)
  assert.equal(
    await credentialsMatch(
      { isActive: true, password: "stored-password-hash" },
      "wrong",
      verify,
    ),
    false,
  )
  assert.deepEqual(comparedHashes, [DUMMY_PASSWORD_HASH, "stored-password-hash"])
})

test("the unknown-account comparison uses a valid cost-10 bcrypt hash", async () => {
  assert.equal(DUMMY_PASSWORD_HASH.startsWith("$2b$10$"), true)
  assert.equal(await bcrypt.compare("wrong", DUMMY_PASSWORD_HASH), false)
})
