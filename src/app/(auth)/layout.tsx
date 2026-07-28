import { ErrorBoundary } from "@/features/errors"

/** Minimal chrome for unauthenticated / kiosk routes (login, clock). */
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex h-svh min-h-0 flex-col overflow-y-auto bg-background">
      <ErrorBoundary>{children}</ErrorBoundary>
    </div>
  )
}
