"use client"

import { useEffect, useState } from "react"
import { Building2 } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  listMyOrganizations,
  switchOrganization,
} from "@/features/organizations/actions/organization-actions"
import type { OrganizationOption } from "@/features/organizations/types/organization-types"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useError } from "@/features/errors"

export function SidebarOrganizationSwitcher() {
  const { run } = useError()
  const { refreshMe } = useAuth()
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([])
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const data = await run(listMyOrganizations())
      if (!cancelled) setOrganizations(data ?? [])
    })()
    return () => {
      cancelled = true
    }
  }, [run])

  const current = organizations.find((organization) => organization.isCurrent)

  const handleChange = async (organizationId: string) => {
    if (!current || organizationId === current.id) return
    setSwitching(true)
    const switched = await run(switchOrganization(organizationId))
    if (switched) {
      await refreshMe()
      window.location.reload()
    }
    setSwitching(false)
  }

  return (
    <SidebarMenu className="px-2 py-2">
      <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
        <div className="space-y-1 px-2">
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Organization
          </span>
          <Select
            value={current?.id}
            disabled={switching || organizations.length < 2}
            onValueChange={(value) => void handleChange(value)}
          >
            <SelectTrigger aria-label="Switch organization" className="h-9">
              <div className="flex min-w-0 items-center gap-2">
                <Building2 className="h-4 w-4 shrink-0 text-primary" />
                <SelectValue placeholder="Loading organization…" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {organizations.map((organization) => (
                <SelectItem key={organization.id} value={organization.id}>
                  {organization.name} · {organization.role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SidebarMenuItem>
      <SidebarMenuItem className="hidden group-data-[collapsible=icon]:block">
        <SidebarMenuButton tooltip={current?.name ?? "Organization"}>
          <Building2 className="h-4 w-4" />
          <span>{current?.name ?? "Organization"}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
