import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db, dbOperation } from "@/lib/db"
import { logDataDeletion, logAuditEvent } from "@/lib/audit-log"
import { createErrorResponse } from "@/lib/error-handler"

// Force dynamic rendering to prevent build-time database calls
export const dynamic = "force-dynamic"

/**
 * GDPR/CCPA Data Deletion Request
 * Allows users to request deletion of their personal data
 */
export async function POST(request: Request) {
  try {
    const sessionUser = await requireAuth()
    const { dataType, reason } = await request.json()

    // Fetch full user from database to get createdAt
    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, email: true, name: true, plan: true, createdAt: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Log the deletion request
    await logDataDeletion(user.id, dataType || "all", user.id, reason || "User request")

    // Delete user's search logs (anonymize by removing userId)
    await db.searchLog.updateMany({
      where: { userId: user.id },
      data: { userId: null },
    })

    // Delete saved searches
    await db.savedSearch.deleteMany({
      where: { userId: user.id },
    })

    // Delete reports (or anonymize)
    await db.report.deleteMany({
      where: { userId: user.id },
    })

    // Delete monitoring subscriptions
    await db.monitoringSubscription.deleteMany({
      where: { userId: user.id },
    })

    // Delete API keys
    await db.apiKey.deleteMany({
      where: { userId: user.id },
    })

    // Note: We don't delete the user account itself, just the associated data
    // The user account may need to be kept for legal/compliance reasons

    return NextResponse.json({
      message: "Data deletion request processed",
      deleted: {
        searchLogs: true,
        savedSearches: true,
        reports: true,
        monitoringSubscriptions: true,
        apiKeys: true,
      },
      deletedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Data deletion error:", error)
    return createErrorResponse(error, "Failed to process deletion request")
  }
}

/**
 * Get user's data export (GDPR right to data portability)
 */
export async function GET(_request: Request) {
  try {
    const sessionUser = await requireAuth()

    // Fetch full user from database to get createdAt
    const user = await dbOperation(
      () =>
        db.user.findUnique({
          where: { id: sessionUser.id },
          select: { id: true, email: true, name: true, plan: true, createdAt: true },
        }),
      null,
    )

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Collect all user data
    const [searchLogs, savedSearches, reports, subscriptions, apiKeys] = await Promise.all([
      dbOperation(
        () =>
          db.searchLog.findMany({
            where: { userId: user.id },
            orderBy: { timestamp: "desc" },
          }),
        [],
      ),
      dbOperation(
        () =>
          db.savedSearch.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
          }),
        [],
      ),
      dbOperation(
        () =>
          db.report.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
          }),
        [],
      ),
      dbOperation(
        () =>
          db.monitoringSubscription.findMany({
            where: { userId: user.id },
          }),
        [],
      ),
      dbOperation(
        () =>
          db.apiKey.findMany({
            where: { userId: user.id },
            select: {
              id: true,
              name: true,
              createdAt: true,
              lastUsed: true,
              // Don't include the actual key for security
            },
          }),
        [],
      ),
    ])

    // Log audit event
    await logAuditEvent({
      userId: user.id,
      action: "data_export",
      resource: "compliance",
      resourceId: user.id,
    }).catch(console.error)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        createdAt: user.createdAt,
      },
      data: {
        searchLogs,
        savedSearches,
        reports,
        monitoringSubscriptions: subscriptions,
        apiKeys,
      },
      exportedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Data export error:", error)
    return createErrorResponse(error, "Failed to export data")
  }
}
