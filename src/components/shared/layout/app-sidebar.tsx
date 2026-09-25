"use client"

import type * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Boxes, Building2, ChevronRight, Hexagon } from "lucide-react"

import { SidebarEdgeToggle } from "./sidebar-edge-toggle"
import { SidebarOrganizationSwitcher } from "./sidebar-organization-switcher"
import { SidebarThemeToggle } from "./sidebar-theme-toggle"
import { SidebarUser } from "./sidebar-user"
import { ProductMark } from "./product-mark"
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
import { publicAppConfig } from "@/lib/app-config"
import { getEnabledNavigationItems, isNavItemActive } from "@/lib/navigation"
import { Actions, can } from "@/features/auth/permissions"
import { useAuth } from "@/features/auth/hooks/use-auth"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { state, setOpen } = useSidebar()
  const { me } = useAuth()
  const canReadMemberships = me
    ? can(me.role, Actions.memberships.read)
    : false
  const ProductIcon =
    publicAppConfig.branding.logo === "modules"
      ? null
      : {
          hexagon: Hexagon,
          boxes: Boxes,
          building: Building2,
        }[publicAppConfig.branding.logo]

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
                tooltip={publicAppConfig.product.name}
              >
                <Link href="/home">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent-muted text-primary">
                    {ProductIcon === null ? (
                      <ProductMark className="size-4" />
                    ) : (
                      <ProductIcon className="size-4" />
                    )}
                  </div>
                  <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold">{publicAppConfig.product.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {publicAppConfig.product.shortName}
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
            {getEnabledNavigationItems().map((item) => {
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
