import assert from "node:assert/strict"
import test from "node:test"

import { renderEnvironment, validateSetupAnswers } from "./setup-config"

const answers = { applicationName: "Northstar", organizationName: "Northstar Ops", adminEmail: "ADMIN@northstar.test", accent: "#123abc", logo: "boxes" as const, databaseMode: "local" as const, includeDemoModules: false }

test("setup environment rendering escapes values and selects core modules", () => {
  const environment = renderEnvironment(answers, { jwtSecret: "jwt-secret", seedPassword: "seed-secret" })
  assert.match(environment, /^DATABASE_URL="postgresql:\/\/erp:erp@localhost:5432\/erp_boilerplate"/)
  assert.match(environment, /SEED_ADMIN_EMAIL="admin@northstar.test"/)
  assert.match(environment, /NEXT_PUBLIC_ENABLED_MODULES="dashboard,members,departments,locations,memberships"/)
})

test("setup validation rejects unsafe brand configuration", () => {
  assert.throws(() => validateSetupAnswers({ ...answers, accent: "blue" }), /6-digit hex color/)
  assert.throws(() => validateSetupAnswers({ ...answers, adminEmail: "not-an-email" }), /valid email/)
})
