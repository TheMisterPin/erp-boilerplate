import { NextRequest } from "next/server"
import { describe, expect, it, vi } from "vitest"

import { middleware } from "@/middleware"

describe("security middleware", () => {
  it("allows health probes and applies a correlated CSP response", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined)
    const response = await middleware(
      new NextRequest("https://erp.example.test/api/health/live"),
    )

    const requestId = response.headers.get("X-Request-ID")
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff")
    expect(response.headers.get("X-Frame-Options")).toBe("DENY")
    expect(response.headers.get("Content-Security-Policy")).toContain(
      `'nonce-${requestId}'`,
    )
    expect(response.headers.get("Content-Security-Policy")).not.toContain(
      "script-src 'unsafe-inline'",
    )
    expect(info).toHaveBeenCalledOnce()
    info.mockRestore()
  })
})
