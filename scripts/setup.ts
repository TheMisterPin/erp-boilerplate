import { access, writeFile } from "node:fs/promises"
import { constants } from "node:fs"
import { createInterface } from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"

import { createSecret, plannedFiles, renderEnvironment, type DatabaseMode, type SetupAnswers, validateSetupAnswers } from "./setup-config"

const dryRun = process.argv.includes("--dry-run")
const force = process.argv.includes("--force")
const yes = process.argv.includes("--yes")

async function fileExists(path: string) {
  try { await access(path, constants.F_OK); return true } catch { return false }
}

async function main() {
  const environmentExists = await fileExists(".env")
  if (environmentExists && !force) {
    console.error(".env already exists. Re-run with --force after reviewing it; setup never overwrites it implicitly.")
    process.exitCode = 1
    return
  }

  const prompts = createInterface({ input, output })
  try {
    const answers: SetupAnswers = yes
      ? { applicationName: process.env.SETUP_APP_NAME || "ERP Boilerplate", organizationName: process.env.SETUP_ORGANIZATION_NAME || "Acme Operations", adminEmail: process.env.SETUP_ADMIN_EMAIL || "admin@example.com", accent: process.env.SETUP_APP_ACCENT || "#5a9fd4", logo: (process.env.SETUP_APP_LOGO || "hexagon") as SetupAnswers["logo"], databaseMode: (process.env.SETUP_DATABASE_MODE || "local") as DatabaseMode, includeDemoModules: process.env.SETUP_INCLUDE_DEMO_MODULES !== "false" }
      : { applicationName: await prompts.question("Application name: "), organizationName: await prompts.question("Initial organization name: "), adminEmail: await prompts.question("Initial admin email: "), accent: await prompts.question("Brand color (#5a9fd4): ") || "#5a9fd4", logo: (await prompts.question("Logo (hexagon, boxes, building) [hexagon]: ") || "hexagon") as SetupAnswers["logo"], databaseMode: (await prompts.question("Database mode (local, docker) [local]: ") || "local") as DatabaseMode, includeDemoModules: (await prompts.question("Include demo modules? (Y/n): ")).trim().toLowerCase() !== "n" }
    validateSetupAnswers(answers)
    if (answers.databaseMode !== "local" && answers.databaseMode !== "docker") throw new Error("Database mode must be local or docker.")
    if (!(["hexagon", "boxes", "building"] as const).includes(answers.logo)) throw new Error("Logo must be hexagon, boxes, or building.")

    console.log(`\nPlan:\n${plannedFiles(environmentExists).map((file) => `  - ${file}`).join("\n")}\n  - configure ${answers.applicationName} for ${answers.organizationName}\n  - ${answers.includeDemoModules ? "enable" : "disable"} optional demo modules`)
    if (dryRun) { console.log("\nDry run complete. No files were changed."); return }
    const confirmed = yes || (await prompts.question("Apply this plan? (y/N): ")).trim().toLowerCase() === "y"
    if (!confirmed) { console.log("No files were changed."); return }

    await writeFile(".env", renderEnvironment(answers, { jwtSecret: createSecret(), seedPassword: createSecret() }), { encoding: "utf8", mode: 0o600 })
    console.log("Created .env. Secrets were generated and are intentionally not printed.")
    console.log("Next: pnpm install && pnpm db:generate && pnpm db:migrate && pnpm db:seed && pnpm dev")
  } finally { prompts.close() }
}

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Setup failed."); process.exitCode = 1 })
