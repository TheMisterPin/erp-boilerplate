import type { NextConfig } from "next"

import { SECURITY_RESPONSE_HEADERS } from "./src/lib/security-headers"

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...SECURITY_RESPONSE_HEADERS],
      },
    ]
  },
}

export default nextConfig
