import type { MetadataRoute } from "next"

import { publicAppConfig } from "@/lib/app-config"

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: publicAppConfig.siteUrl, lastModified: new Date() }]
}
