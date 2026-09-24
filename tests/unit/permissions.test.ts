import { describe, expect, it } from "vitest"

import { Actions, can, permissionsForRole } from "@/features/auth/permissions"

describe("permission matrix", () => {
  it("grants administrators every current action", () => {
    expect(can("ADMIN", Actions.users.write)).toBe(true)
    expect(can("ADMIN", Actions.logging.read)).toBe(true)
    expect(can("ADMIN", Actions.timeOff.write)).toBe(true)
  })

  it("keeps ordinary users out of administrative actions", () => {
    expect(can("USER", Actions.users.write)).toBe(false)
    expect(can("USER", Actions.logging.read)).toBe(false)
    expect(can("USER", Actions.timeOff.write)).toBe(true)
    expect(permissionsForRole("USER")).not.toContain("users:write")
  })
})
