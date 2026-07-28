/* eslint-disable react-hooks/static-components */
"use client"

import { usePathname } from "next/navigation"

import { getPageIcon, getPageTitle } from "@/lib/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function AppHeader() {
  const pathname = usePathname()
  const Icon = getPageIcon(pathname)

  return (
    <div className="flex w-full items-center justify-between gap-2 md:justify-start">
      <SidebarTrigger className="md:hidden" />
      <div className="flex items-center gap-2">
        <Icon className="size-5 shrink-0 text-primary" />
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          {getPageTitle(pathname)}
        </h1>
      </div>
    </div>
  )
}
