"use client"

import {
  Children,
  isValidElement,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react"
import { MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export type RowActionItemProps = {
  /** Shown in the tooltip and as the button aria-label. */
  label: string
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
  /** Destructive styling for delete / irreversible actions. */
  destructive?: boolean
}

/** One action inside `RowActionsMenu` — icon button + tooltip. */
export function RowActionItem({
  label,
  icon,
  onClick,
  disabled,
  destructive = false,
}: RowActionItemProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          disabled={disabled}
          className={cn(
            "h-8 w-8",
            destructive &&
              "text-destructive hover:bg-destructive/10 hover:text-destructive",
          )}
          onClick={(event) => {
            event.stopPropagation()
            onClick()
          }}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

export type RowActionsMenuProps = {
  /** Accessible name for the trigger. */
  label?: string
  /** `RowActionItem` children (null/false filtered out). */
  children: ReactNode
  className?: string
  align?: ComponentProps<typeof PopoverContent>["align"]
}

/**
 * Single “⋯” trigger that opens a popover of tooltip-labeled row actions.
 * Use instead of stacking multiple icon buttons in `rowActions`.
 */
export function RowActionsMenu({
  label = "Row actions",
  children,
  className,
  align = "end",
}: RowActionsMenuProps) {
  const [open, setOpen] = useState(false)

  const items = Children.toArray(children).filter(
    (child): child is ReactElement => isValidElement(child),
  )

  if (items.length === 0) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          className={cn("h-8 w-8", className)}
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        side="bottom"
        className="w-auto p-1"
        onClick={(event) => event.stopPropagation()}
      >
        <TooltipProvider delayDuration={200}>
          <div
            className="flex items-center gap-0.5"
            role="menu"
            aria-label={label}
          >
            {items.map((item, index) => (
              <div
                key={item.key ?? index}
                role="none"
                onClick={() => setOpen(false)}
              >
                {item}
              </div>
            ))}
          </div>
        </TooltipProvider>
      </PopoverContent>
    </Popover>
  )
}
