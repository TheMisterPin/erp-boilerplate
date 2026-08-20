import assert from "node:assert/strict"
import { test } from "node:test"

import { shouldSeed } from "./should-seed"

test("seeds when there are no users", () => {
  assert.equal(shouldSeed(0), true)
})

test("skips when any user exists", () => {
  assert.equal(shouldSeed(1), false)
  assert.equal(shouldSeed(42), false)
})
