import { describe, expect, it } from "vitest"

import { Actions, can, permissionsForRole } from "@/features/auth/permissions"

describe("permission matrix", () => {
  it("grants administrators every current action", () => {
    expect(can("ADMIN", Actions.users.write)).toBe(true)
    expect(can("ADMIN", Actions.logging.read)).toBe(true)
    expect(can("ADMIN", Actions.timeOff.write)).toBe(true)
    expect(can("ADMIN", Actions.memberships.write)).toBe(true)
  })

  it("gives managers operational write access without administration", () => {
    expect(can("MANAGER", Actions.users.write)).toBe(false)
    expect(can("MANAGER", Actions.shifts.write)).toBe(true)
    expect(can("MANAGER", Actions.logging.read)).toBe(false)
    expect(can("MANAGER", Actions.memberships.write)).toBe(false)
  })

  it("preserves legacy user access in the operator role", () => {
    expect(can("OPERATOR", Actions.users.write)).toBe(false)
    expect(can("OPERATOR", Actions.logging.read)).toBe(false)
    expect(can("OPERATOR", Actions.timeOff.write)).toBe(true)
    expect(permissionsForRole("OPERATOR")).not.toContain("users:write")
  })

  it("keeps viewers read-only", () => {
    expect(can("VIEWER", Actions.shifts.read)).toBe(true)
    expect(can("VIEWER", Actions.shifts.write)).toBe(false)
    expect(can("VIEWER", Actions.timeOff.write)).toBe(false)
  })
})
