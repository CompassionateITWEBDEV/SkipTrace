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

    const reportResult = await dbOperation(
      () =>
        db.report.findUnique({
          where: { sharedToken: token },
        }),
      null,
    )

    if (!reportResult) {
      return NextResponse.json({ error: "Report not found or link has expired" }, { status: 404 })
    }

    // Type assertion: dbOperation + Prisma can infer 'never' after null check in some builds
    const report = reportResult as { id: string; shared: boolean; [key: string]: unknown }

    if (!report.shared) {
      return NextResponse.json({ error: "This report is not shared" }, { status: 403 })
    }

    return NextResponse.json({ report: reportResult })
  } catch (error) {
    console.error("Error fetching shared report:", error)
    return createErrorResponse(error, "Failed to fetch shared report")
  }
}
