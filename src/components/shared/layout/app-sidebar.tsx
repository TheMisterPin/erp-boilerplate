"use client"

import type * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Hexagon } from "lucide-react"

import { SidebarEdgeToggle } from "./sidebar-edge-toggle"
import { SidebarOrganizationSwitcher } from "./sidebar-organization-switcher"
import { SidebarThemeToggle } from "./sidebar-theme-toggle"
import { SidebarUser } from "./sidebar-user"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { isNavItemActive, navigationItems } from "@/lib/navigation"
import { Actions, can } from "@/features/auth/permissions"
import { useAuth } from "@/features/auth/hooks/use-auth"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { state, setOpen } = useSidebar()
  const { me } = useAuth()
  const canReadMemberships = me
    ? can(me.role, Actions.memberships.read)
    : false

  return (
    <Sidebar collapsible="icon" className="overflow-visible" {...props}>
      <SidebarHeader className="shrink-0 gap-0 border-b border-sidebar-border p-0">
        <div className="flex h-16 items-center px-2">
          <SidebarMenu className="min-w-0 flex-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                asChild
                className="data-[slot=sidebar-menu-button]:p-2"
                tooltip="ERP Boilerplate"
              >
                <Link href="/">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent-muted text-primary">
                    <Hexagon className="size-4" />
                  </div>
                  <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold">ERP Boilerplate</span>
                    <span className="truncate text-xs text-muted-foreground">
                      ERP UI
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarHeader>
      <SidebarOrganizationSwitcher />
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navigationItems.map((item) => {
              const visibleSubItems = item.items?.filter(
                (subItem) =>
                  subItem.url !== "/organization/memberships" ||
                  canReadMemberships,
              )
              const visibleItem = visibleSubItems
                ? { ...item, items: visibleSubItems }
                : item

              return visibleItem.items ? (
                <Collapsible
                  key={visibleItem.title}
                  asChild
                  defaultOpen={isNavItemActive(pathname, visibleItem.url)}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={visibleItem.title}
                        onClick={() => {
                          if (state === "collapsed") setOpen(true)
                        }}
                      >
                        {visibleItem.icon && <visibleItem.icon className="h-4 w-4" />}
                        <span>{visibleItem.title}</span>
                        <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[collapsible=icon]:hidden group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {visibleItem.items.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname === subItem.url}
                            >
                              <Link href={subItem.url}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ) : (
                <SidebarMenuItem key={visibleItem.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isNavItemActive(pathname, visibleItem.url)}
                    tooltip={visibleItem.title}
                  >
                    <Link href={visibleItem.url}>
                      {visibleItem.icon && <visibleItem.icon className="h-4 w-4" />}
                      <span>{visibleItem.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-1 border-t border-sidebar-border">
        <SidebarThemeToggle />
        <SidebarUser />
      </SidebarFooter>
      <SidebarEdgeToggle />
      <SidebarRail />
    </Sidebar>
  )
}
