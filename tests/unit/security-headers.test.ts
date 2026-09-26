import { describe, expect, it } from "vitest"

import {
  applySecurityHeaders,
  createContentSecurityPolicy,
  SECURITY_RESPONSE_HEADERS,
} from "@/lib/security-headers"

describe("security headers", () => {
  it("builds a nonce-based CSP without an unsafe script allowance", () => {
    const policy = createContentSecurityPolicy("requestnonce")

    expect(policy).toContain("script-src 'self' 'nonce-requestnonce' 'strict-dynamic'")
    expect(policy).not.toContain("'unsafe-eval'")
    expect(policy).not.toContain("script-src 'unsafe-inline'")
    expect(policy).toContain("object-src 'none'")
    expect(policy).toContain("frame-ancestors 'none'")
    expect(policy).toContain("form-action 'self'")
  })

  it("allows eval only for the development React refresh runtime", () => {
    const policy = createContentSecurityPolicy("requestnonce", { dev: true })

    expect(policy).toContain(
      "script-src 'self' 'nonce-requestnonce' 'strict-dynamic' 'unsafe-eval'",
    )
    expect(policy).not.toContain("script-src 'unsafe-inline'")
  })

  it("applies the documented defensive response headers", () => {
    const headers = new Headers()
    applySecurityHeaders(headers, "default-src 'self'")

    for (const header of SECURITY_RESPONSE_HEADERS) {
      expect(headers.get(header.key)).toBe(header.value)
    }
    expect(headers.get("Content-Security-Policy")).toBe("default-src 'self'")
  })
})
