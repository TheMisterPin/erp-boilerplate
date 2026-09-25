import type { MetadataRoute } from "next"

import { publicAppConfig } from "@/lib/app-config"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${publicAppConfig.siteUrl}/sitemap.xml`,
  }
}
