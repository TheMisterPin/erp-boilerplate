import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"

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
  title: {
    default: publicAppConfig.product.name,
    template: `%s | ${publicAppConfig.product.name}`,
  },
  description: publicAppConfig.product.description,
}
export const viewport: Viewport = { themeColor: publicAppConfig.branding.accent }

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
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
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
