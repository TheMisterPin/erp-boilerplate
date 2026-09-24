import { NextRequest, NextResponse } from "next/server"

import { decrypt, SESSION_COOKIE, updateSession } from "./features/auth/utils"
import {
  applySecurityHeaders,
  createContentSecurityPolicy,
} from "./lib/security-headers"
import { logServerEvent } from "./lib/observability/log"

const PUBLIC_PATHS = new Set([
  "/login",
  "/clock",
  "/api/health/live",
  "/api/health/ready",
])

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname)
}

function withSecurityHeaders(
  response: NextResponse,
  contentSecurityPolicy: string,
  requestId: string,
): NextResponse {
  applySecurityHeaders(response.headers, contentSecurityPolicy)
  response.headers.set("X-Request-ID", requestId)
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const requestId = crypto.randomUUID().replaceAll("-", "")
  const contentSecurityPolicy = createContentSecurityPolicy(requestId)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-request-id", requestId)
  requestHeaders.set("x-nonce", requestId)
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy)

  logServerEvent("info", "http.request", {
    requestId,
    method: request.method,
    pathname,
  })

  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await decrypt(token) : null

  if (!session && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return withSecurityHeaders(
      NextResponse.redirect(loginUrl),
      contentSecurityPolicy,
      requestId,
    )
  }

  if (session && pathname === "/login") {
    return withSecurityHeaders(
      NextResponse.redirect(new URL("/", request.url)),
      contentSecurityPolicy,
      requestId,
    )
  }

  if (session) {
    return withSecurityHeaders(
      await updateSession(request, requestHeaders),
      contentSecurityPolicy,
      requestId,
    )
  }

  return withSecurityHeaders(
    NextResponse.next({ request: { headers: requestHeaders } }),
    contentSecurityPolicy,
    requestId,
  )
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and Next internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
