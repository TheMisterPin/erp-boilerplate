import assert from "node:assert/strict"
import test from "node:test"

import { featureFiles, featureNames } from "./generate-feature"

test("feature names support plural and multi-word input", () => {
  assert.deepEqual(featureNames("cost centers"), {
    singular: "cost-center",
    plural: "cost-centers",
    pascal: "CostCenter",
    route: "cost-centers",
  })
})

test("read-only and CRUD templates produce the canonical files", () => {
  const readOnly = featureFiles("vendors", "read-only")
  const crud = featureFiles("vendors", "crud")
  assert.ok(readOnly["src/features/vendors/actions/vendor-actions.ts"])
  assert.doesNotMatch(readOnly["src/features/vendors/actions/vendor-actions.ts"]!, /createVendor/)
  assert.match(crud["src/features/vendors/actions/vendor-actions.ts"]!, /createVendor/)
  assert.ok(crud["src/app/(app)/vendors/page.tsx"])
})
