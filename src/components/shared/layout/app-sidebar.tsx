"use client"

import type * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Hexagon } from "lucide-react"

import { SidebarEdgeToggle } from "./sidebar-edge-toggle"
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
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { isNavItemActive, navigationItems } from "@/lib/navigation"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { state, setOpen } = useSidebar()

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
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navigationItems.map((item) =>
              item.items ? (
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={isNavItemActive(pathname, item.url)}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={item.title}
                        onClick={() => {
                          if (state === "collapsed") setOpen(true)
                        }}
                      >
                        {item.icon && <item.icon className="h-4 w-4" />}
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[collapsible=icon]:hidden group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items.map((subItem) => (
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
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isNavItemActive(pathname, item.url)}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      {item.icon && <item.icon className="h-4 w-4" />}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ),
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarSeparator className="mx-0" />
        <SidebarUser />
      </SidebarFooter>
      <SidebarEdgeToggle />
      <SidebarRail />
    </Sidebar>
  )
}
