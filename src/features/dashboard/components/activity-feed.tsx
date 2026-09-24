import {
  CalendarClock,
  CalendarDays,
  Info,
  LogIn,
  LogOut,
  UserPlus,
  type LucideIcon,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatRelativeTime } from "@/features/dashboard/lib/format"
import type { FeedItem } from "@/features/dashboard/types/dashboard-types"

const KIND_ICONS: Record<FeedItem["kind"], LucideIcon> = {
  "check-in": LogIn,
  "check-out": LogOut,
  "time-off": CalendarClock,
  shift: CalendarDays,
  member: UserPlus,
  system: Info,
}

export type ActivityFeedProps = {
  items: FeedItem[]
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Live activity</CardTitle>
        <CardDescription>Latest events across your scope</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No recent activity.
          </p>
        ) : (
          <ul className="flex flex-col">
            {items.map((item) => {
              const Icon = KIND_ICONS[item.kind] ?? Info
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 border-b py-2.5 last:border-0"
                >
                  <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
                    <Icon className="text-muted-foreground size-4" />
                  </span>
                  <p className="min-w-0 flex-1 truncate text-sm">{item.title}</p>
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {formatRelativeTime(item.timestamp)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
