import { describe, expect, it, vi } from "vitest"

import { logServerEvent, redactForLog } from "@/lib/observability/log"

describe("operational logging", () => {
  it("redacts sensitive fields and connection strings before logging", () => {
    expect(
      redactForLog({
        password: "super-secret",
        authorization: "Bearer token-value",
        nested: { databaseUrl: "postgresql://erp:secret@db:5432/erp" },
      }),
    ).toEqual({
      password: "[REDACTED]",
      authorization: "[REDACTED]",
      nested: { databaseUrl: "[REDACTED]" },
    })
  })

  it("emits machine-readable log entries", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined)

    logServerEvent("info", "health.ready", {
      requestId: "request-123",
      token: "must-not-appear",
    })

    expect(info).toHaveBeenCalledOnce()
    expect(JSON.parse(info.mock.calls[0][0])).toMatchObject({
      level: "info",
      event: "health.ready",
      requestId: "request-123",
      token: "[REDACTED]",
    })
    info.mockRestore()
  })
})
