"use client"

import { PanelLeftClose, PanelLeftOpen } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"

/** 32px handle on the sidebar/content seam, centered in the brand header. */
export function SidebarEdgeToggle() {
  const { state, toggleSidebar } = useSidebar()
  const collapsed = state === "collapsed"
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar"

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      data-sidebar="trigger"
      aria-label={label}
      aria-expanded={!collapsed}
      title={label}
      onClick={toggleSidebar}
      className="absolute top-8 right-0 z-30 hidden size-8 translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-border-subtle bg-sidebar text-sidebar-foreground shadow-sm transition-colors duration-200 hover:bg-surface-3 md:inline-flex"
    >
      <Icon className="size-4" />
    </Button>
  )
}
