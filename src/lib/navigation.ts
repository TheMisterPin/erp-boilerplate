import type { LucideIcon } from "lucide-react"
import { Building2, Home, Users } from "lucide-react"

export type NavigationSubItem = {
  title: string
  url: string
}

export type NavigationItem = {
  title: string
  icon: LucideIcon
  url: string
  items?: NavigationSubItem[]
}

export const navigationItems: NavigationItem[] = [
  {
    title: "Home",
    icon: Home,
    url: "/",
  },
  {
    title: "Team",
    icon: Users,
    url: "/team",
    items: [
      { title: "Members", url: "/team/members" },
      { title: "Activity", url: "/team/activity" },
      { title: "Shift templates", url: "/team/shift-templates" },
      { title: "My shifts", url: "/team/my-shifts" },
    ],
  },
  {
    title: "Organization",
    icon: Building2,
    url: "/organization",
    items: [
      { title: "Departments", url: "/organization/departments" },
      { title: "Locations", url: "/organization/locations" },
    ],
  },
]

export function getPageTitle(pathname: string): string {
  for (const item of navigationItems) {
    if (item.items) {
      const subItem = item.items.find((sub) => sub.url === pathname)
      if (subItem) return subItem.title
    }
    if (item.url === pathname) return item.title
  }

  if (pathname === "/") return "Home"

  const segment = pathname.split("/").filter(Boolean).pop()
  if (!segment) return "Home"

  return segment.charAt(0).toUpperCase() + segment.slice(1)
}

export function getPageIcon(pathname: string): LucideIcon {
  for (const item of navigationItems) {
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
