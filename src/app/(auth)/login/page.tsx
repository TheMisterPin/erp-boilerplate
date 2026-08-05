import { Suspense } from "react"

import LoginPage from "./login-client"
import { LoginSkeleton } from "./login-skeleton"

export default function LoginRoute() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginPage />
    </Suspense>
  )
}
