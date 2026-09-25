const MODULE_IDS = [
  "dashboard",
  "members",
  "activity",
  "shiftTemplates",
  "shifts",
  "timeOff",
  "departments",
  "locations",
  "memberships",
] as const

export type ModuleId = (typeof MODULE_IDS)[number]

export type PublicAppConfig = {
  product: { name: string; shortName: string; description: string }
  branding: {
    logo: "modules" | "hexagon" | "boxes" | "building"
    accent: string
    accentHover: string
    accentMuted: string
    focusRing: string
  }
  support: { documentationUrl: string; issuesUrl: string }
  siteUrl: string
  enabledModules: readonly ModuleId[]
}

type PublicEnvironment = Partial<
  Pick<
    NodeJS.ProcessEnv,
    | "NEXT_PUBLIC_APP_NAME"
    | "NEXT_PUBLIC_APP_SHORT_NAME"
    | "NEXT_PUBLIC_APP_DESCRIPTION"
    | "NEXT_PUBLIC_APP_LOGO"
    | "NEXT_PUBLIC_APP_ACCENT"
    | "NEXT_PUBLIC_APP_ACCENT_HOVER"
    | "NEXT_PUBLIC_APP_ACCENT_MUTED"
    | "NEXT_PUBLIC_APP_FOCUS_RING"
    | "NEXT_PUBLIC_APP_DOCUMENTATION_URL"
    | "NEXT_PUBLIC_APP_ISSUES_URL"
    | "NEXT_PUBLIC_SITE_URL"
    | "NEXT_PUBLIC_ENABLED_MODULES"
  >
>

const DEFAULT_MODULES: readonly ModuleId[] = MODULE_IDS

const defaults: PublicAppConfig = {
  product: {
    name: "ERP Boilerplate",
    shortName: "ERP UI",
    description: "ERP UI boilerplate",
  },
  branding: {
    logo: "modules",
    accent: "#5a9fd4",
    accentHover: "#72afe0",
    accentMuted: "#1c3a50",
    focusRing: "#6bade0",
  },
  support: {
    documentationUrl: "https://github.com/TheMisterPin/erp-boilerplate#readme",
    issuesUrl: "https://github.com/TheMisterPin/erp-boilerplate/issues",
  },
  siteUrl: "https://erp-boilerplate.vercel.app",
  enabledModules: DEFAULT_MODULES,
}

function requiredText(value: string | undefined, name: string, fallback: string) {
  const resolved = value?.trim() || fallback
  if (resolved.length > 120) {
    throw new Error(`${name} must be 120 characters or fewer.`)
  }
  return resolved
}

function cssColor(value: string | undefined, name: string, fallback: string) {
  const resolved = value?.trim() || fallback
  if (!/^#[0-9a-fA-F]{6}$/.test(resolved)) {
    throw new Error(`${name} must be a 6-digit hex color, for example #5a9fd4.`)
  }
  return resolved
}

function logo(value: string | undefined): PublicAppConfig["branding"]["logo"] {
  const resolved = value?.trim() || defaults.branding.logo
  if (
    resolved === "modules" ||
    resolved === "hexagon" ||
    resolved === "boxes" ||
    resolved === "building"
  ) {
    return resolved
  }
  throw new Error(
    "NEXT_PUBLIC_APP_LOGO must be one of: modules, hexagon, boxes, building.",
  )
}

function absoluteUrl(value: string | undefined, name: string, fallback: string) {
  const resolved = value?.trim() || fallback
  try {
    const url = new URL(resolved)
    if (url.protocol !== "https:") throw new Error("unsupported protocol")
    return url.toString()
  } catch {
    throw new Error(`${name} must be a valid https URL.`)
  }
}

function enabledModules(value: string | undefined): readonly ModuleId[] {
  if (!value?.trim()) return DEFAULT_MODULES
  const modules = value
    .split(",")
    .map((module) => module.trim())
    .filter(Boolean)
  const invalid = modules.filter(
    (module) => !MODULE_IDS.includes(module as ModuleId),
  )
  if (invalid.length > 0) {
    throw new Error(
      `NEXT_PUBLIC_ENABLED_MODULES contains unsupported module(s): ${invalid.join(", ")}. Supported modules: ${MODULE_IDS.join(", ")}.`,
    )
  }
  return [...new Set(modules)] as ModuleId[]
}

/**
 * Only public environment variables are read here, making this safe for Client
 * Components.
 */
export function createPublicAppConfig(
  environment: PublicEnvironment = process.env as PublicEnvironment,
): PublicAppConfig {
  return Object.freeze({
    product: Object.freeze({
      name: requiredText(
        environment.NEXT_PUBLIC_APP_NAME,
        "NEXT_PUBLIC_APP_NAME",
        defaults.product.name,
      ),
      shortName: requiredText(
        environment.NEXT_PUBLIC_APP_SHORT_NAME,
        "NEXT_PUBLIC_APP_SHORT_NAME",
        defaults.product.shortName,
      ),
      description: requiredText(
        environment.NEXT_PUBLIC_APP_DESCRIPTION,
        "NEXT_PUBLIC_APP_DESCRIPTION",
        defaults.product.description,
      ),
    }),
    branding: Object.freeze({
      logo: logo(environment.NEXT_PUBLIC_APP_LOGO),
      accent: cssColor(
        environment.NEXT_PUBLIC_APP_ACCENT,
        "NEXT_PUBLIC_APP_ACCENT",
        defaults.branding.accent,
      ),
      accentHover: cssColor(
        environment.NEXT_PUBLIC_APP_ACCENT_HOVER,
        "NEXT_PUBLIC_APP_ACCENT_HOVER",
        defaults.branding.accentHover,
      ),
      accentMuted: cssColor(
        environment.NEXT_PUBLIC_APP_ACCENT_MUTED,
        "NEXT_PUBLIC_APP_ACCENT_MUTED",
        defaults.branding.accentMuted,
      ),
      focusRing: cssColor(
        environment.NEXT_PUBLIC_APP_FOCUS_RING,
        "NEXT_PUBLIC_APP_FOCUS_RING",
        defaults.branding.focusRing,
      ),
    }),
    support: Object.freeze({
      documentationUrl: absoluteUrl(
        environment.NEXT_PUBLIC_APP_DOCUMENTATION_URL,
        "NEXT_PUBLIC_APP_DOCUMENTATION_URL",
        defaults.support.documentationUrl,
      ),
      issuesUrl: absoluteUrl(
        environment.NEXT_PUBLIC_APP_ISSUES_URL,
        "NEXT_PUBLIC_APP_ISSUES_URL",
        defaults.support.issuesUrl,
      ),
    }),
    siteUrl: absoluteUrl(
      environment.NEXT_PUBLIC_SITE_URL,
      "NEXT_PUBLIC_SITE_URL",
      defaults.siteUrl,
    ),
    enabledModules: Object.freeze(enabledModules(environment.NEXT_PUBLIC_ENABLED_MODULES)),
  })
}

/** Safe configuration subset shared by server and client code. */
export const publicAppConfig = createPublicAppConfig()

export function isModuleEnabled(module: ModuleId): boolean {
  return publicAppConfig.enabledModules.includes(module)
}

export { MODULE_IDS }
