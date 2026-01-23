import { NextResponse } from "next/server"
import { db, dbOperation } from "@/lib/db"
import { createErrorResponse } from "@/lib/error-handler"

// Force dynamic rendering to prevent build-time database calls
export const dynamic = "force-dynamic"

/**
 * Get a shared report by token (no authentication required)
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params

    const report = await dbOperation(
      () =>
        db.report.findUnique({
          where: { sharedToken: token },
        }),
      null,
    )

    if (!report) {
      return NextResponse.json({ error: "Report not found or link has expired" }, { status: 404 })
    }

    if (!report.shared) {
      return NextResponse.json({ error: "This report is not shared" }, { status: 403 })
    }

    return NextResponse.json({ report })
  } catch (error) {
    console.error("Error fetching shared report:", error)
    return createErrorResponse(error, "Failed to fetch shared report")
  }
}
