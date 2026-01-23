import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db, dbOperation } from "@/lib/db"
import { createErrorResponse } from "@/lib/error-handler"
import { logAuditEvent } from "@/lib/audit-log"

// Force dynamic rendering
export const dynamic = "force-dynamic"

/**
 * GDPR/CCPA Data Export Request
 * Allows users to export all their personal data
 */
export async function GET() {
  try {
    const user = await requireAuth()

    // Fetch user data
    const userData = await dbOperation(
      () =>
        db.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            email: true,
            name: true,
            plan: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            image: true,
          },
        }),
      null,
    )

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Collect all user data
    const [searchLogs, savedSearches, reports, subscriptions, apiKeys, batchJobs] = await Promise.all(
      [
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
                expiresAt: true,
                // Don't include the actual key for security
              },
            }),
          [],
        ),
        dbOperation(
          () =>
            db.batchJob.findMany({
              where: { userId: user.id },
              orderBy: { createdAt: "desc" },
            }),
          [],
        ),
      ],
    )

    // Log audit event
    await logAuditEvent({
      userId: user.id,
      action: "data_export",
      resource: "compliance",
      resourceId: user.id,
      details: {
        searchLogsCount: searchLogs.length,
        savedSearchesCount: savedSearches.length,
        reportsCount: reports.length,
        subscriptionsCount: subscriptions.length,
        apiKeysCount: apiKeys.length,
        batchJobsCount: batchJobs.length,
      },
    }).catch(console.error)

    const exportData = {
      user: userData,
      data: {
        searchLogs,
        savedSearches,
        reports,
        monitoringSubscriptions: subscriptions,
        apiKeys,
        batchJobs,
      },
      metadata: {
        exportedAt: new Date().toISOString(),
        format: "json",
        version: "1.0",
      },
    }

    return NextResponse.json(exportData, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="skiptrace-data-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    })
  } catch (error) {
    console.error("Data export error:", error)
    return createErrorResponse(error, "Failed to export data")
  }
}
