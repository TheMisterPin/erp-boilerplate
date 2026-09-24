import { NextResponse } from "next/server"

import {
  logServerEvent,
  requestLogContext,
} from "@/lib/observability/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const context = requestLogContext(request.headers)
  logServerEvent("info", "health.live", context)

  return NextResponse.json(
    { status: "ok" },
    { headers: { "Cache-Control": "no-store" } },
  )
}
