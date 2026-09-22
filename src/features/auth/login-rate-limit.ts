import { createHash } from "node:crypto"

import {
  getLoginRateLimitMaxAttempts,
  getLoginRateLimitSourceMaxAttempts,
  getLoginRateLimitWindowSeconds,
} from "@/lib/env"

const DEFAULT_MAX_ENTRIES = 10_000

export type LoginRateLimitSubject = {
  identifierFingerprint: string
  sourceFingerprint?: string
}

export type LoginRateLimitDecision = {
  allowed: boolean
  retryAfterSeconds: number
}

export interface LoginRateLimiter {
  check(subject: LoginRateLimitSubject): Promise<LoginRateLimitDecision>
  recordFailure(
    subject: LoginRateLimitSubject,
  ): Promise<LoginRateLimitDecision>
  resetIdentifier(subject: LoginRateLimitSubject): Promise<void>
}

type Counter = {
  failures: number
  expiresAt: number
}

type InMemoryLoginRateLimiterOptions = {
  identifierMaxAttempts: number
  sourceMaxAttempts: number
  windowMs: number
  maxEntries?: number
  now?: () => number
}

type LimitRule = {
  key: string
  maxAttempts: number
}

function requirePositiveInteger(name: string, value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`)
  }

  return value
}

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24)
}

export function normalizeLoginIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase()
}

export function createLoginRateLimitSubject(
  identifier: string,
  source?: string | null,
): LoginRateLimitSubject {
  const normalizedIdentifier = normalizeLoginIdentifier(identifier)
  const normalizedSource = source?.trim().toLowerCase()

  return {
    identifierFingerprint: fingerprint(normalizedIdentifier),
    sourceFingerprint: normalizedSource
      ? fingerprint(normalizedSource)
      : undefined,
  }
}

export function getLoginClientSource(
  requestHeaders: Pick<Headers, "get">,
): string | null {
  const forwardedFor = requestHeaders.get("x-forwarded-for")
  const source =
    forwardedFor?.split(",", 1)[0]?.trim() ||
    requestHeaders.get("x-real-ip")?.trim() ||
    null

  return source && source.toLowerCase() !== "unknown" ? source : null
}

export class InMemoryLoginRateLimiter implements LoginRateLimiter {
  private readonly counters = new Map<string, Counter>()
  private readonly identifierMaxAttempts: number
  private readonly sourceMaxAttempts: number
  private readonly windowMs: number
  private readonly maxEntries: number
  private readonly now: () => number

  constructor(options: InMemoryLoginRateLimiterOptions) {
    this.identifierMaxAttempts = requirePositiveInteger(
      "identifierMaxAttempts",
      options.identifierMaxAttempts,
    )
    this.sourceMaxAttempts = requirePositiveInteger(
      "sourceMaxAttempts",
      options.sourceMaxAttempts,
    )
    this.windowMs = requirePositiveInteger("windowMs", options.windowMs)
    this.maxEntries = requirePositiveInteger(
      "maxEntries",
      options.maxEntries ?? DEFAULT_MAX_ENTRIES,
    )
    this.now = options.now ?? Date.now
  }

  async check(
    subject: LoginRateLimitSubject,
  ): Promise<LoginRateLimitDecision> {
    return this.evaluate(this.rulesFor(subject), this.now())
  }

  async recordFailure(
    subject: LoginRateLimitSubject,
  ): Promise<LoginRateLimitDecision> {
    const now = this.now()
    const rules = this.rulesFor(subject)

    for (const rule of rules) {
      const current = this.activeCounter(rule.key, now)
      this.ensureCapacity(now, current ? 0 : 1)
      this.counters.set(rule.key, {
        failures: (current?.failures ?? 0) + 1,
        expiresAt: current?.expiresAt ?? now + this.windowMs,
      })
    }

    return this.evaluate(rules, now)
  }

  async resetIdentifier(subject: LoginRateLimitSubject): Promise<void> {
    this.counters.delete(`identifier:${subject.identifierFingerprint}`)
  }

  private rulesFor(subject: LoginRateLimitSubject): LimitRule[] {
    const rules: LimitRule[] = [
      {
        key: `identifier:${subject.identifierFingerprint}`,
        maxAttempts: this.identifierMaxAttempts,
      },
    ]

    if (subject.sourceFingerprint) {
      rules.push({
        key: `source:${subject.sourceFingerprint}`,
        maxAttempts: this.sourceMaxAttempts,
      })
    }

    return rules
  }

  private activeCounter(key: string, now: number): Counter | undefined {
    const counter = this.counters.get(key)
    if (counter && counter.expiresAt <= now) {
      this.counters.delete(key)
      return undefined
    }

    return counter
  }

  private evaluate(rules: LimitRule[], now: number): LoginRateLimitDecision {
    let retryAfterSeconds = 0

    for (const rule of rules) {
      const counter = this.activeCounter(rule.key, now)
      if (counter && counter.failures >= rule.maxAttempts) {
        retryAfterSeconds = Math.max(
          retryAfterSeconds,
          Math.ceil((counter.expiresAt - now) / 1000),
        )
      }
    }

    return {
      allowed: retryAfterSeconds === 0,
      retryAfterSeconds,
    }
  }

  private ensureCapacity(now: number, additionalEntries: number): void {
    if (this.counters.size + additionalEntries <= this.maxEntries) return

    for (const [key, counter] of this.counters) {
      if (counter.expiresAt <= now) this.counters.delete(key)
    }

    while (this.counters.size + additionalEntries > this.maxEntries) {
      const oldestKey = this.counters.keys().next().value as
        | string
        | undefined
      if (!oldestKey) return
      this.counters.delete(oldestKey)
    }
  }
}

function createDefaultLoginRateLimiter(): LoginRateLimiter {
  return new InMemoryLoginRateLimiter({
    identifierMaxAttempts: getLoginRateLimitMaxAttempts(),
    sourceMaxAttempts: getLoginRateLimitSourceMaxAttempts(),
    windowMs: getLoginRateLimitWindowSeconds() * 1000,
  })
}

const globalForLoginRateLimit = globalThis as typeof globalThis & {
  erpLoginRateLimiter?: LoginRateLimiter
}

/**
 * Process-local default for development and single-instance deployments.
 * Replace this binding with a distributed LoginRateLimiter in multi-instance
 * or serverless deployments.
 */
export const loginRateLimiter =
  globalForLoginRateLimit.erpLoginRateLimiter ?? createDefaultLoginRateLimiter()

if (process.env.NODE_ENV !== "production") {
  globalForLoginRateLimit.erpLoginRateLimiter = loginRateLimiter
}
