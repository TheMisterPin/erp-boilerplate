import { NextRequest, NextResponse } from "next/server"

import { decrypt, SESSION_COOKIE, updateSession } from "./features/auth/utils"

const PUBLIC_PATHS = new Set(["/login", "/clock"])

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await decrypt(token) : null

  if (!session && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url))
  }

  if (session) {
    return await updateSession(request)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and Next internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
