import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db, dbOperation } from "@/lib/db"
import { isAdmin } from "@/lib/rbac"
import { createErrorResponse } from "@/lib/error-handler"

// Force dynamic rendering
export const dynamic = "force-dynamic"

/**
 * Get admin dashboard statistics
 */
export async function GET() {
  try {
    const user = await requireAuth()
    
    // Verify admin access
    const admin = await isAdmin(user.id)
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Get system statistics
    const [totalUsers, totalSearches, activeUsers] = await Promise.all([
      dbOperation(() => db.user.count(), 0),
      dbOperation(() => db.searchLog.count(), 0),
      dbOperation(
        () =>
          db.searchLog.findMany({
            where: {
              timestamp: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
              },
            },
            select: { userId: true },
            distinct: ["userId"],
          }),
        [],
      ),
    ])

    const activeUserCount = activeUsers.filter((u: { userId: string | null }) => u.userId).length

    // Simple system health check
    const systemHealth = "healthy" // In production, check API status, database connectivity, etc.

    return NextResponse.json({
      totalUsers,
      totalSearches,
      activeUsers: activeUserCount,
      systemHealth,
    })
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return createErrorResponse(error, "Failed to fetch admin statistics")
  }
}
