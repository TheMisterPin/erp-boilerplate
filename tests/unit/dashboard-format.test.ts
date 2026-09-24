import { describe, expect, it } from "vitest"

import {
  formatDateRange,
  formatRelativeTime,
  initials,
} from "@/features/dashboard/lib/format"

describe("dashboard format helpers", () => {
  it("renders relative times", () => {
    const now = Date.now()
    expect(formatRelativeTime(new Date(now - 30_000).toISOString())).toBe(
      "just now",
    )
    expect(formatRelativeTime(new Date(now - 5 * 60_000).toISOString())).toBe(
      "5m ago",
    )
    expect(formatRelativeTime(new Date(now - 3 * 3_600_000).toISOString())).toBe(
      "3h ago",
    )
    expect(
      formatRelativeTime(new Date(now - 2 * 86_400_000).toISOString()),
    ).toBe("2d ago")
  })

  it("collapses single-day ranges", () => {
    const oct17 = new Date(2026, 9, 17, 12).toISOString()
    const oct19 = new Date(2026, 9, 19, 12).toISOString()
    expect(formatDateRange(oct17, oct17)).toBe("Oct 17")
    expect(formatDateRange(oct17, oct19)).toBe("Oct 17 – Oct 19")
  })

  it("builds avatar initials", () => {
    expect(initials("Jordan Davis")).toBe("JD")
    expect(initials("michele")).toBe("M")
    expect(initials("")).toBe("")
  })
})
