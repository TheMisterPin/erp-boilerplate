import { Check, X } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  formatDateRange,
  formatRelativeTime,
  initials,
} from "@/features/dashboard/lib/format"
import type { AttentionItem } from "@/features/dashboard/types/dashboard-types"

export type AttentionQueueProps = {
  items: AttentionItem[]
  onApprove: (item: AttentionItem) => void
  onReject: (item: AttentionItem) => void
}

export function AttentionQueue({ items, onApprove, onReject }: AttentionQueueProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Needs your attention</CardTitle>
          {items.length > 0 && (
            <Badge variant="secondary">{items.length} pending</Badge>
          )}
        </div>
        <CardDescription>Time-off requests waiting on your review</CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 flex-1">
        {items.length === 0 ? (
          <Empty className="py-8">
            <EmptyHeader>
              <EmptyTitle>All caught up</EmptyTitle>
              <EmptyDescription>
                No time-off requests are waiting for your review.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-lg px-2 py-2.5"
              >
                <Avatar className="size-9 shrink-0">
                  <AvatarFallback>{initials(item.userName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.userName}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {item.type === "SICK" ? "Sick leave" : "Time off"} ·{" "}
                    {formatDateRange(item.startDate, item.endDate)} ·{" "}
                    {formatRelativeTime(item.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onReject(item)}
                    aria-label={`Reject request from ${item.userName}`}
                  >
                    <X className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onApprove(item)}
                    aria-label={`Approve request from ${item.userName}`}
                  >
                    <Check className="size-4" />
                    Approve
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
