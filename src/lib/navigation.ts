import type { LucideIcon } from "lucide-react"
import { Building2, Home, Users } from "lucide-react"

import { publicAppConfig, type ModuleId } from "@/lib/app-config"

export type NavigationSubItem = {
  title: string
  url: string
  module: ModuleId
}

export type NavigationItem = {
  title: string
  icon: LucideIcon
  url: string
  module?: ModuleId
  items?: NavigationSubItem[]
}

export const navigationItems: NavigationItem[] = [
  {
    title: "Home",
    icon: Home,
    url: "/",
    module: "dashboard",
  },
  {
    title: "Team",
    icon: Users,
    url: "/team",
    items: [
      { title: "Members", url: "/team/members", module: "members" },
      { title: "Activity", url: "/team/activity", module: "activity" },
      { title: "Shift templates", url: "/team/shift-templates", module: "shiftTemplates" },
      { title: "My shifts", url: "/team/my-shifts", module: "shifts" },
      { title: "Time off", url: "/team/time-off", module: "timeOff" },
    ],
  },
  {
    title: "Organization",
    icon: Building2,
    url: "/organization",
    items: [
      { title: "Departments", url: "/organization/departments", module: "departments" },
      { title: "Locations", url: "/organization/locations", module: "locations" },
      { title: "Memberships", url: "/organization/memberships", module: "memberships" },
    ],
  },
]

export function getEnabledNavigationItems(
  enabledModules: readonly ModuleId[] = publicAppConfig.enabledModules,
): NavigationItem[] {
  return navigationItems.flatMap((item) => {
    if (item.items) {
      const items = item.items.filter((subItem) => enabledModules.includes(subItem.module))
      return items.length > 0 ? [{ ...item, items }] : []
    }
    return item.module && enabledModules.includes(item.module) ? [item] : []
  })
}

export function getPageTitle(pathname: string): string {
  for (const item of getEnabledNavigationItems()) {
    if (item.items) {
      const subItem = item.items.find((sub) => sub.url === pathname)
      if (subItem) return subItem.title
    }
    if (item.url === pathname) return item.title
  }

  if (pathname === "/") return "Home"
  if (pathname === "/profile") return "Profile"

  const segment = pathname.split("/").filter(Boolean).pop()
  if (!segment) return "Home"

  return segment.charAt(0).toUpperCase() + segment.slice(1)
}

export function getPageIcon(pathname: string): LucideIcon {
  for (const item of getEnabledNavigationItems()) {
    if (item.items) {
      const subItem = item.items.find((sub) => sub.url === pathname)
      if (subItem) return item.icon
      if (isNavItemActive(pathname, item.url)) return item.icon
    }
    if (item.url === pathname) return item.icon
  }

  return Home
}

export function isNavItemActive(pathname: string, url: string): boolean {
  if (url === "/") return pathname === "/"
  return pathname === url || pathname.startsWith(`${url}/`)
}
