import { renderToStaticMarkup } from "react-dom/server"
import { expect, it } from "vitest"

import { ThemeProvider } from "@/components/shared/layout/theme-provider"

it("stamps the request CSP nonce onto the theme bootstrap script", () => {
  const html = renderToStaticMarkup(
    <ThemeProvider nonce="requestnonce">
      <div>app</div>
    </ThemeProvider>,
  )

  expect(html).toContain('nonce="requestnonce"')
  expect(html).toContain("<script")
})
