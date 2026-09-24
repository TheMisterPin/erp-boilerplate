import { spawnSync } from "node:child_process"

import { getTestDatabaseUrl } from "../tests/support/test-database"

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm"
const result = spawnSync(pnpmCommand, ["exec", "prisma", "migrate", "deploy"], {
  env: {
    ...process.env,
    DATABASE_URL: getTestDatabaseUrl(),
  },
  stdio: "inherit",
})

if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)
