import { describe, expect, it } from "vitest"

import { createPublicAppConfig } from "@/lib/app-config"
import { getEnabledNavigationItems } from "@/lib/navigation"

describe("public application configuration", () => {
  it("uses the current demo defaults", () => {
    const config = createPublicAppConfig({})
    expect(config.product.name).toBe("ERP Boilerplate")
    expect(config.siteUrl).toBe("https://erp-boilerplate.vercel.app/")
    expect(config.theme.preset).toBe("midnight")
    expect(config.enabledModules).toContain("memberships")
  })

  it("accepts a typed enabled-module subset", () => {
    const config = createPublicAppConfig({
      NEXT_PUBLIC_APP_NAME: "Northstar Operations",
      NEXT_PUBLIC_APP_LOGO: "boxes",
      NEXT_PUBLIC_THEME_PRESET: "slate",
      NEXT_PUBLIC_ENABLED_MODULES: "dashboard, members, departments",
    })
    expect(config.product.name).toBe("Northstar Operations")
    expect(config.branding.logo).toBe("boxes")
    expect(config.theme.preset).toBe("slate")
    expect(config.enabledModules).toEqual(["dashboard", "members", "departments"])
  })

  it("fails early with actionable invalid configuration messages", () => {
    expect(() =>
      createPublicAppConfig({ NEXT_PUBLIC_ENABLED_MODULES: "dashboard,unknown" }),
    ).toThrow(/unsupported module\(s\): unknown/)
    expect(() =>
      createPublicAppConfig({ NEXT_PUBLIC_APP_ACCENT: "blue" }),
    ).toThrow(/NEXT_PUBLIC_APP_ACCENT must be a 6-digit hex color/)
    expect(() =>
      createPublicAppConfig({ NEXT_PUBLIC_APP_LOGO: "circle" }),
    ).toThrow(/NEXT_PUBLIC_APP_LOGO must be one of/)
    expect(() =>
      createPublicAppConfig({ NEXT_PUBLIC_THEME_PRESET: "rainbow" }),
    ).toThrow(/NEXT_PUBLIC_THEME_PRESET must be one of/)
  })

  it("removes disabled modules from navigation entry points", () => {
    const navigation = getEnabledNavigationItems(["dashboard", "members"])

    expect(navigation.map((item) => item.title)).toEqual(["Home", "Team"])
    expect(navigation[1]?.items?.map((item) => item.title)).toEqual(["Members"])
  })
})
