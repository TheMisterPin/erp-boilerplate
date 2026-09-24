import { NextResponse } from "next/server"

import { prisma } from "@/lib/db"
import {
  logServerEvent,
  reportServerError,
  requestLogContext,
} from "@/lib/observability/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const context = requestLogContext(request.headers)

  try {
    await prisma.$queryRaw`SELECT 1`
    logServerEvent("info", "health.ready", context)
    return NextResponse.json(
      { status: "ok" },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    await reportServerError(error, { ...context, operation: "health.ready" })
    return NextResponse.json(
      { status: "unavailable" },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    )
  }
}
