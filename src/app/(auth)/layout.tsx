import { ErrorBoundary } from "@/features/errors"

/** Minimal chrome for unauthenticated / kiosk routes (login, clock). */
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex h-svh min-h-0 flex-col overflow-y-auto bg-background">

      <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-8">
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    </div>
  )
}
