import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db, dbOperation } from "@/lib/db"
import { logDataDeletion, logAuditEvent, logAccountDeletion } from "@/lib/audit-log"
import { createErrorResponse } from "@/lib/error-handler"

// Force dynamic rendering to prevent build-time database calls
export const dynamic = "force-dynamic"

/**
 * GDPR/CCPA Data Deletion Request
 * Allows users to request deletion of their personal data.
 * Optionally set deleteAccount: true in the body to also close the account (delete the user record).
 * Without deleteAccount, only associated data is removed; the account remains for retention purposes if required.
 */
export async function POST(request: Request) {
  try {
    const sessionUser = await requireAuth()
    const body = await request.json().catch(() => ({}))
    const { dataType, reason, deleteAccount } = body as {
      dataType?: string
      reason?: string
      deleteAccount?: boolean
    }

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

    // Delete notifications
    await db.notification.deleteMany({
      where: { userId: user.id },
    })

    // Optionally delete the user account (full account closure)
    if (deleteAccount === true) {
      await logAccountDeletion(user.id, user.email).catch(() => {})
      await db.batchJob.updateMany({ where: { userId: user.id }, data: { userId: null } })
      await db.user.delete({
        where: { id: user.id },
      })
      return NextResponse.json({
        message: "Account and all associated data have been permanently deleted",
        deleted: {
          searchLogs: true,
          savedSearches: true,
          reports: true,
          monitoringSubscriptions: true,
          apiKeys: true,
          notifications: true,
          account: true,
        },
        deletedAt: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      message: "Data deletion request processed (account retained)",
      deleted: {
        searchLogs: true,
        savedSearches: true,
        reports: true,
        monitoringSubscriptions: true,
        apiKeys: true,
        notifications: true,
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
    const userResult = await dbOperation(
      () =>
        db.user.findUnique({
          where: { id: sessionUser.id },
          select: { id: true, email: true, name: true, plan: true, createdAt: true },
        }),
      null,
    )

    if (!userResult) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Type assertion: dbOperation + Prisma can infer 'never' after null check in some builds
    const user = userResult as { id: string; email: string | null; name: string | null; plan: string; createdAt: Date }

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
