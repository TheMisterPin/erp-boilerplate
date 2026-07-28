"use client"

import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export type DataTableFrameProps = {
  /** Search / filters / actions — stays fixed; does not scroll with rows. */
  toolbar?: ReactNode
  /** Scrollable table content. */
  children: ReactNode
  /** Pagination / meta — stays fixed below the scroll region. */
  footer?: ReactNode
  className?: string
}

/**
 * Enforces sticky toolbar + scrollable body for all data tables.
 * Parent must provide a bounded height (`h-full` / flex `min-h-0` chain).
 * Column headers stick inside `.table-surface` (the row scrollport).
 */
export function DataTableFrame({
  toolbar,
  children,
  footer,
  className,
}: DataTableFrameProps) {
  return (
    <div className={cn("table-shell", className)}>
      {toolbar ? <header className="table-toolbar">{toolbar}</header> : null}
      <div className="table-body-region">{children}</div>
      {footer ? (
        <footer className="table-footer-region">{footer}</footer>
      ) : null}
    </div>
  )
}

export type TablePageViewportProps = {
  children: ReactNode
  className?: string
}

/**
 * Full-bleed locked viewport under the app header for list routes.
 * Fills the AppShell content slot; only `.table-surface` should scroll.
 */
export function TablePageViewport({
  children,
  className,
}: TablePageViewportProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-1 flex-col overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  )
}
