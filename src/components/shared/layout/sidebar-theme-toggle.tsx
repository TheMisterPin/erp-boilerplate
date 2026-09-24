"use client"

import { useSyncExternalStore } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Switch } from "@/components/ui/switch"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const subscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

export function SidebarThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isClient = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  )
  const isDark = !isClient || resolvedTheme !== "light"
  const Icon = isDark ? Moon : Sun

  const setDark = (dark: boolean) => {
    setTheme(dark ? "dark" : "light")
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
        <label
          htmlFor="sidebar-dark-mode"
          className="flex w-full cursor-pointer items-center gap-2 overflow-hidden rounded-md p-2 transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <Icon className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 text-sm">Dark mode</span>
          <Switch
            id="sidebar-dark-mode"
            checked={isDark}
            disabled={!isClient}
            onCheckedChange={setDark}
          />
        </label>
      </SidebarMenuItem>
      <SidebarMenuItem className="hidden group-data-[collapsible=icon]:block">
        <SidebarMenuButton
          tooltip={isDark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={() => setDark(!isDark)}
        >
          <Icon className="size-4" />
          <span>Dark mode</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
