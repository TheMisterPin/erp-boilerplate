import { randomBytes } from "node:crypto"

export type DatabaseMode = "local" | "docker"

export type SetupAnswers = {
  applicationName: string
  organizationName: string
  adminEmail: string
  accent: string
  logo: "hexagon" | "boxes" | "building"
  databaseMode: DatabaseMode
  includeDemoModules: boolean
}

const DEMO_MODULES = [
  "dashboard",
  "members",
  "activity",
  "shiftTemplates",
  "shifts",
  "timeOff",
  "departments",
  "locations",
  "memberships",
].join(",")

const CORE_MODULES = "dashboard,members,departments,locations,memberships"

export function validateSetupAnswers(input: SetupAnswers): SetupAnswers {
  if (!input.applicationName.trim()) throw new Error("Application name is required.")
  if (!input.organizationName.trim()) throw new Error("Organization name is required.")
  if (!/^\S+@\S+\.\S+$/.test(input.adminEmail)) {
    throw new Error("Initial admin email must be a valid email address.")
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(input.accent)) {
    throw new Error("Brand color must be a 6-digit hex color, for example #5a9fd4.")
  }
  return { ...input, applicationName: input.applicationName.trim(), organizationName: input.organizationName.trim(), adminEmail: input.adminEmail.trim().toLowerCase() }
}

export function createSecret(): string {
  return randomBytes(32).toString("base64url")
}

function quote(value: string): string {
  return JSON.stringify(value)
}

export function renderEnvironment(input: SetupAnswers, secrets: { jwtSecret: string; seedPassword: string }): string {
  const answers = validateSetupAnswers(input)
  const databaseUrl = answers.databaseMode === "docker"
    ? "postgresql://erp:erp@localhost:5432/components_playground"
    : "postgresql://erp:erp@localhost:5432/erp_boilerplate"

  const values = {
    DATABASE_URL: databaseUrl,
    JWT_SECRET: secrets.jwtSecret,
    SEED_PASSWORD: secrets.seedPassword,
    SEED_ADMIN_EMAIL: answers.adminEmail,
    SEED_ORGANIZATION_NAME: answers.organizationName,
    NEXT_PUBLIC_APP_NAME: answers.applicationName,
    NEXT_PUBLIC_APP_SHORT_NAME: answers.applicationName,
    NEXT_PUBLIC_APP_ACCENT: answers.accent,
    NEXT_PUBLIC_APP_LOGO: answers.logo,
    NEXT_PUBLIC_ENABLED_MODULES: answers.includeDemoModules ? DEMO_MODULES : CORE_MODULES,
  }

  return `${Object.entries(values).map(([key, value]) => `${key}=${quote(value)}`).join("\n")}\n`
}

export function plannedFiles(environmentExists: boolean): string[] {
  return [environmentExists ? ".env (replace after confirmation)" : ".env (create)"]
}
