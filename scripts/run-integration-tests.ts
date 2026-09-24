import { spawnSync } from "node:child_process"

import { config } from "dotenv"

config({ path: ".env.test" })

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm"
const env = { ...process.env }

for (const command of [
  ["exec", "tsx", "scripts/test-db-prepare.ts"],
  ["exec", "vitest", "run", "tests/integration", "--no-file-parallelism"],
]) {
  const result = spawnSync(pnpmCommand, command, { env, stdio: "inherit" })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
