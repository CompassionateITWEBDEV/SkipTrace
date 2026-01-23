import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db, dbOperation } from "@/lib/db"
import { createErrorResponse } from "@/lib/error-handler"

// Force dynamic rendering
export const dynamic = "force-dynamic"

/**
 * Get monitoring alerts for the current user
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const _unreadOnly = searchParams.get("unreadOnly") === "true" // Reserved for future use

    // Get recent reports that were created from monitoring (these are alerts)
    const where: { userId: string; title?: { contains: string } } = {
      userId: user.id,
      title: { contains: "Monitoring Alert" },
    }

    const alerts = await dbOperation(
      () =>
        db.report.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
          select: {
            id: true,
            title: true,
            query: true,
            results: true,
            createdAt: true,
            searchType: true,
          },
        }),
      [],
    )

    // In a full implementation, you'd have a separate alerts table with read/unread status
    // For now, we'll use reports as alerts

    return NextResponse.json({
      alerts: alerts.map((alert) => ({
        id: alert.id,
        title: alert.title,
        type: alert.searchType,
        query: typeof alert.query === "string" ? JSON.parse(alert.query) : alert.query,
        results: alert.results,
        createdAt: alert.createdAt,
        read: false, // Would come from alerts table in full implementation
      })),
      total: alerts.length,
    })
  } catch (error) {
    console.error("Error fetching monitoring alerts:", error)
    return createErrorResponse(error, "Failed to fetch monitoring alerts")
  }
}

/**
 * Mark alert as read
 */
export async function PATCH(request: Request) {
  try {
    const _user = await requireAuth() // Reserved for future use
    const body = await request.json().catch(() => ({}))
    const { alertId } = body

    if (!alertId) {
      return NextResponse.json({ error: "Alert ID is required" }, { status: 400 })
    }

    // In a full implementation, update an alerts table
    // For now, we'll just return success
    return NextResponse.json({
      message: "Alert marked as read",
      alertId,
    })
  } catch (error) {
    console.error("Error updating alert:", error)
    return createErrorResponse(error, "Failed to update alert")
  }
}
