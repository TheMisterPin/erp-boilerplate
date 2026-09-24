import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ queryRaw: vi.fn() }))

vi.mock("@/lib/db", () => ({
  prisma: { $queryRaw: mocks.queryRaw },
}))

import { GET as live } from "@/app/api/health/live/route"
import { GET as ready } from "@/app/api/health/ready/route"

describe("health routes", () => {
  it("reports liveness without accessing the database", async () => {
    const response = await live(
      new Request("http://localhost/api/health/live", {
        headers: { "x-request-id": "live-request" },
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: "ok" })
    expect(response.headers.get("Cache-Control")).toBe("no-store")
    expect(mocks.queryRaw).not.toHaveBeenCalled()
  })

  it("reports ready only when the database probe succeeds", async () => {
    mocks.queryRaw.mockResolvedValueOnce([{ "?column?": 1 }])

    const response = await ready(new Request("http://localhost/api/health/ready"))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: "ok" })
  })

  it("does not leak a database failure through readiness", async () => {
    mocks.queryRaw.mockRejectedValueOnce(
      new Error("postgresql://erp:very-secret@db:5432/erp is unavailable"),
    )

    const response = await ready(new Request("http://localhost/api/health/ready"))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ status: "unavailable" })
  })
})
