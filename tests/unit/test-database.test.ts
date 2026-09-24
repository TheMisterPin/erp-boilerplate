import { afterEach, describe, expect, it } from "vitest"

import { getTestDatabaseUrl } from "../support/test-database"

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
})

describe("integration database guard", () => {
  it("never falls back to the application database URL", () => {
    delete process.env.DATABASE_URL_TEST
    process.env.DATABASE_URL = "postgresql://erp:erp@localhost:5432/erp_dev"

    expect(() => getTestDatabaseUrl()).toThrow(/DATABASE_URL_TEST is required/)
  })

  it("requires a clearly named test database", () => {
    process.env.DATABASE_URL_TEST = "postgresql://erp:erp@localhost:5432/erp"

    expect(() => getTestDatabaseUrl()).toThrow(/ending in _test/)
  })

  it("rejects an equal development connection outside CI", () => {
    process.env.CI = "false"
    process.env.DATABASE_URL = "postgresql://erp:erp@localhost:5432/erp_test"
    process.env.DATABASE_URL_TEST = process.env.DATABASE_URL

    expect(() => getTestDatabaseUrl()).toThrow(/must differ from DATABASE_URL/)
  })

  it("accepts a separate test-only connection", () => {
    process.env.DATABASE_URL = "postgresql://erp:erp@localhost:5432/erp_dev"
    process.env.DATABASE_URL_TEST = "postgresql://erp:erp@localhost:5432/erp_test"

    expect(getTestDatabaseUrl()).toBe(process.env.DATABASE_URL_TEST)
  })
})
