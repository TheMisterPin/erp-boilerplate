"use client"

import { ModalProvider, ModalRoot } from "@/components/shared/modals"
import { ThemeProvider } from "@/components/shared/layout/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/features/auth/hooks/auth-context"
import { ErrorProvider } from "@/features/errors"

/**
 * Root providers shared by authenticated app and login.
 * ErrorProvider wraps ModalRoot so form modals can call useError().run().
 * ErrorBoundary stays content-scoped in AppShell / auth layout.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ModalProvider>
        <AuthProvider>
          <ErrorProvider>
            {children}
            <ModalRoot />
            <Toaster />
          </ErrorProvider>
        </AuthProvider>
      </ModalProvider>
    </ThemeProvider>
  )
}
