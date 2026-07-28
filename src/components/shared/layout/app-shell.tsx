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
      <SidebarInset className="h-svh min-h-0 overflow-hidden bg-background">
        <header className="flex h-16 shrink-0 items-center border-b border-border bg-surface-1 px-6 text-foreground">
          <AppHeader />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-background p-8">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
