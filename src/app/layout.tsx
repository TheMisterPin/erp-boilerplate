import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import { AppProviders } from "@/components/shared/layout/app-providers"
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
  title: "Components Playground",
  description: "ERP UI boilerplate",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "dark h-full antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
      )}
    >
      <body className="h-svh overflow-hidden">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
