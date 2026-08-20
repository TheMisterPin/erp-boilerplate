"use client"

import { useEffect, useMemo, useState } from "react"

import { Actions, can } from "@/features/auth/permissions"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useError } from "@/features/errors"
import { listActivities } from "@/features/logging/actions/activity-actions"
import type { ActivityListPageProps } from "@/features/logging/components/pages/activity-list-page"
import { toActivityTableRow } from "@/features/logging/components/tables/activity-table-columns"
import type { UserActivityItem } from "@/features/logging/types/activity-types"

/** Page logic for activity list — inject into `ActivityListPage`. */
export function useActivityListPage(): ActivityListPageProps {
  const { run } = useError()
  const { me, status } = useAuth()
  const [items, setItems] = useState<UserActivityItem[]>([])
  const [loaded, setLoaded] = useState(false)

  const canRead = me ? can(me.role, Actions.logging.read) : false

  useEffect(() => {
    if (status !== "authenticated" || !canRead) return

    let cancelled = false
    void (async () => {
      const data = await run(listActivities())
      if (!cancelled) {
        setItems(data ?? [])
        setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [canRead, run, status])

  const rows = useMemo(() => items.map(toActivityTableRow), [items])

  return {
    loaded: status !== "loading" && (!canRead || loaded),
    canRead,
    items,
    rows,
  }
}
