// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { afterEach, expect, it } from "vitest"

import { Button } from "@/components/ui/button"

afterEach(cleanup)

it("renders a usable button", () => {
  render(<Button>Save changes</Button>)

  expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled()
})
