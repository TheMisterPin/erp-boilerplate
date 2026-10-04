import { describe, expect, it } from "vitest"

import { dashboardWindow, shiftDayKey } from "@/features/dashboard/lib/dates"
import { shouldEnsureDemoData } from "@/features/demo/should-ensure-demo-data"

describe("shouldEnsureDemoData", () => {
  it("fills demo data during local development", () => {
    expect(shouldEnsureDemoData({ NODE_ENV: "development" })).toBe(true)
  })

  it("stays off in production unless explicitly enabled", () => {
    expect(shouldEnsureDemoData({ NODE_ENV: "production" })).toBe(false)
    expect(
      shouldEnsureDemoData({ NODE_ENV: "production", SEED_ON_LOGIN: "true" }),
    ).toBe(true)
  })

  it("stays off during tests and when disabled", () => {
    expect(shouldEnsureDemoData({ NODE_ENV: "test" })).toBe(false)
    expect(
      shouldEnsureDemoData({ NODE_ENV: "development", SEED_ON_LOGIN: "false" }),
    ).toBe(false)
  })
})

describe("dashboardWindow", () => {
  it("counts a UTC calendar shift on the local today", () => {
    const now = new Date(2026, 9, 4, 9, 30, 0)
    const window = dashboardWindow(now)
    const storedToday = new Date(Date.UTC(2026, 9, 4))

    expect(shiftDayKey(storedToday)).toBe("2026-10-04")
    expect(window.last7ShiftKeys[6]).toBe("2026-10-04")
    expect(window.weekShiftKeys).toHaveLength(7)
    expect(storedToday >= window.instanceFrom && storedToday < window.instanceTo).toBe(true)
  })
})
