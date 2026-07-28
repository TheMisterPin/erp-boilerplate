import { AppHeader } from "./app-header"
import { AppSidebar } from "./app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { ErrorBoundary } from "@/features/errors"

/** Authenticated app chrome — sidebar + header. Providers live in root layout. */
export default function AppShell({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar />
      <SidebarInset className="flex h-svh min-h-0 flex-col overflow-hidden bg-background">
        <header className="flex h-16 shrink-0 items-center border-b border-border bg-surface-1 px-6 text-foreground">
          <AppHeader />
        </header>
        {/* Locked content slot — pages must scroll internally (table body / PageScroll). */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
