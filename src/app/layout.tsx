import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { headers } from "next/headers"
import { connection } from "next/server"

import { AppProviders } from "@/components/shared/layout/app-providers"
import { publicAppConfig } from "@/lib/app-config"
import { cn } from "@/lib/utils"

import "./globals.css"

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  metadataBase: new URL(publicAppConfig.siteUrl),
  title: {
    default: publicAppConfig.product.name,
    template: `%s | ${publicAppConfig.product.name}`,
  },
  description: publicAppConfig.product.description,
  applicationName: publicAppConfig.product.name,
  icons: { icon: "/icon.svg" },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: publicAppConfig.product.name,
    description: publicAppConfig.product.description,
    siteName: publicAppConfig.product.name,
  },
  twitter: {
    card: "summary",
    title: publicAppConfig.product.name,
    description: publicAppConfig.product.description,
  },
}
export const viewport: Viewport = { themeColor: publicAppConfig.branding.accent }

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Nonce CSP is applied during the request render. A static shell has no
  // nonce, and `strict-dynamic` then blocks Next's scripts in production.
  await connection()
  const nonce = (await headers()).get("x-nonce") ?? undefined

  return (
    <html
      lang="en"
      data-theme={publicAppConfig.theme.preset}
      suppressHydrationWarning
      className={cn(
        "dark h-full antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
      )}
      style={
        {
          "--app-accent": publicAppConfig.branding.accent,
          "--app-accent-hover": publicAppConfig.branding.accentHover,
          "--app-accent-muted": publicAppConfig.branding.accentMuted,
          "--app-focus-ring": publicAppConfig.branding.focusRing,
        } as React.CSSProperties
      }
    >
      <body className="h-svh overflow-hidden">
        <script
          nonce={nonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: publicAppConfig.product.name,
              description: publicAppConfig.product.description,
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              url: publicAppConfig.siteUrl,
              codeRepository: publicAppConfig.support.documentationUrl.replace(/#readme$/, ""),
              license: "https://opensource.org/license/mit",
            }),
          }}
        />
        <AppProviders nonce={nonce}>{children}</AppProviders>
      </body>
    </html>
  )
}
