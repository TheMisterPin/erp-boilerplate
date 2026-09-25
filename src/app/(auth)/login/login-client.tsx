"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useError } from "@/features/errors"
import { loginAction } from "@/features/auth/actions/auth-actions"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { Separator } from "@/components/ui/separator"
import { publicAppConfig } from "@/lib/app-config"

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/"
  return raw
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { run } = useError()
  const { refreshMe } = useAuth()
  const [email, setEmail] = useState("admin@example.com")
  const [password, setPassword] = useState("")

  return (
    <Card className="mx-auto w-full max-w-md rounded-xl border-border-subtle bg-card shadow-none">
      <header className="shrink-0 px-6 pt-8 pb-2 text-center">
        <p className="mx-auto w-fit bg-linear-to-r from-foreground to-primary bg-clip-text text-2xl font-semibold tracking-tight text-transparent">
          {publicAppConfig.product.name}
        </p>
      </header>
      <Separator className="my-4" />
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-semibold">Sign in</CardTitle>
        <CardDescription>
          Use your account credentials to access the app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            const me = await run(loginAction({ email, password }))
            if (me) {
              await refreshMe()
              toast.success(`Welcome, ${me.fullName}`)
              router.push(safeNextPath(searchParams.get("next")))
              router.refresh()
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full cursor-pointer">
            Sign in
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
