"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAuth } from "@/features/auth/hooks/use-auth"

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase()
}

export function SidebarUser() {
  const router = useRouter()
  const { me, status, logout } = useAuth()
  const { isMobile, setOpenMobile } = useSidebar()

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5">
        <div className="h-8 w-8 animate-pulse rounded-full bg-sidebar-accent" />
        <div className="grid flex-1 gap-1 group-data-[collapsible=icon]:hidden">
          <div className="h-3 w-24 animate-pulse rounded bg-sidebar-accent" />
          <div className="h-2.5 w-32 animate-pulse rounded bg-sidebar-accent" />
        </div>
      </div>
    )
  }

  if (!me) return null

  const handleOpenProfile = () => {
    if (isMobile) setOpenMobile(false)
    router.push("/profile")
  }

  const handleLogout = async () => {
    await logout()
    toast.success("Signed out")
    if (isMobile) setOpenMobile(false)
    router.push("/login")
    router.refresh()
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
          <button
            type="button"
            aria-label="Open profile"
            className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left outline-none hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:justify-center"
            onClick={handleOpenProfile}
          >
            <Avatar className="h-8 w-8 rounded-lg">
              {me.pictureUrl ? (
                <AvatarImage src={me.pictureUrl} alt={me.fullName} />
              ) : null}
              <AvatarFallback className="rounded-lg text-xs">
                {initialsFromName(me.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-medium">{me.fullName}</span>
              <span className="truncate text-xs text-muted-foreground">
                {me.email}
              </span>
            </div>
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 group-data-[collapsible=icon]:hidden"
            aria-label="Sign out"
            onClick={(event) => {
              event.stopPropagation()
              void handleLogout()
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarMenuItem>
      <SidebarMenuItem className="hidden group-data-[collapsible=icon]:block">
        <SidebarMenuButton
          tooltip="Sign out"
          onClick={() => void handleLogout()}
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
