import { NextResponse } from "next/server"
import { db, dbOperation } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { createErrorResponse } from "@/lib/error-handler"

// Force dynamic rendering to prevent build-time database calls
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get("days") || "30")
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Build where clause - admin can see all, users see only their own
    const where: { timestamp: { gte: Date }; userId?: string } = {
      timestamp: { gte: startDate },
    }

    // For now, users only see their own data
    // In the future, add admin role check here
    if (user.plan !== "ENTERPRISE") {
      where.userId = user.id
    }

    // Get total searches
    const totalSearches = await dbOperation(
      () => db.searchLog.count({ where }),
      0,
    )

    // Get successful searches
    const successfulSearches = await dbOperation(
      () =>
        db.searchLog.count({
          where: { ...where, success: true },
        }),
      0,
    )

    // Calculate success rate
    const successRate = totalSearches > 0 ? (successfulSearches / totalSearches) * 100 : 0

    // Get active users (users who performed searches in the period)
    const activeUsers = await dbOperation(
      () =>
        db.searchLog.findMany({
          where,
          select: { userId: true },
          distinct: ["userId"],
        }),
      [],
    )
    const activeUserCount = activeUsers.filter((u: { userId: string | null }) => u.userId).length

    // Get average response time
    const avgResponseTimeResult = await dbOperation(
      () =>
        db.searchLog.aggregate({
          where: { ...where, responseTime: { not: null } },
          _avg: { responseTime: true },
        }),
      { _avg: { responseTime: null } },
    )
    const avgResponseTime = avgResponseTimeResult._avg.responseTime
      ? Math.round(avgResponseTimeResult._avg.responseTime)
      : 0

    // Get searches by type
    const searchesByType = await dbOperation(
      () =>
        db.searchLog.groupBy({
          by: ["searchType"],
          where,
          _count: { id: true },
        }),
      [],
    )

    // Get daily search volume for the last 30 days
    // Using Prisma's query builder instead of raw SQL for better compatibility
    const allLogs = await dbOperation(
      () =>
        db.searchLog.findMany({
          where,
          select: { timestamp: true },
          orderBy: { timestamp: "desc" },
        }),
      [],
    )

    // Group by date
    const dailyVolumesMap = new Map<string, number>()
    allLogs.forEach((log: { timestamp: Date }) => {
      const date = log.timestamp.toISOString().split("T")[0]
      dailyVolumesMap.set(date, (dailyVolumesMap.get(date) || 0) + 1)
    })

    const dailyVolumes = Array.from(dailyVolumesMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30)

    // Get search type distribution
    const typeDistribution = searchesByType.reduce(
      (acc: Record<string, number>, item: { searchType: string; _count: { id: number } }) => {
        acc[item.searchType] = item._count.id
        return acc
      },
      {} as Record<string, number>,
    )

    // Calculate percentage for each type
    const typePercentages: Record<string, number> = {}
    for (const [type, count] of Object.entries(typeDistribution)) {
      const countNum = typeof count === 'number' ? count : 0
      typePercentages[type] = totalSearches > 0 ? Math.round((countNum / totalSearches) * 100) : 0
    }

    // Get average data points per successful search
    const successfulLogs = await dbOperation(
      () =>
        db.searchLog.findMany({
          where: { ...where, success: true },
          select: { resultsCount: true },
        }),
      [],
    )
    const totalDataPoints = successfulLogs.reduce((sum: number, log: { resultsCount: number }) => sum + log.resultsCount, 0)
    const avgDataPoints = successfulLogs.length > 0 ? Math.round(totalDataPoints / successfulLogs.length) : 0

    // Get peak usage times (by hour of day)
    const logsWithTime = await dbOperation(
      () =>
        db.searchLog.findMany({
          where,
          select: { timestamp: true },
        }),
      [],
    )
    const hourlyCounts = new Map<number, number>()
    logsWithTime.forEach((log: { timestamp: Date }) => {
      const hour = new Date(log.timestamp).getHours()
      hourlyCounts.set(hour, (hourlyCounts.get(hour) || 0) + 1)
    })
    const peakHours = Array.from(hourlyCounts.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Get success rate trends (by day)
    const successRateByDay = new Map<string, { total: number; successful: number }>()
    allLogs.forEach((log: { timestamp: Date; success?: boolean }) => {
      const date = log.timestamp.toISOString().split("T")[0]
      const current = successRateByDay.get(date) || { total: 0, successful: 0 }
      current.total++
      if (log.success) current.successful++
      successRateByDay.set(date, current)
    })
    const successRateTrends = Array.from(successRateByDay.entries())
      .map(([date, data]) => ({
        date,
        successRate: data.total > 0 ? Math.round((data.successful / data.total) * 100) : 0,
        total: data.total,
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30)

    // Get user retention metrics (users who searched in multiple days)
    const userActivityByDay = new Map<string, Set<string>>()
    allLogs.forEach((log: { timestamp: Date; userId?: string | null }) => {
      if (!log.userId) return
      const date = log.timestamp.toISOString().split("T")[0]
      if (!userActivityByDay.has(date)) {
        userActivityByDay.set(date, new Set())
      }
      userActivityByDay.get(date)?.add(log.userId)
    })
    const uniqueUsersPerDay = Array.from(userActivityByDay.entries())
      .map(([date, users]) => ({ date, count: users.size }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30)

    return NextResponse.json({
      totalSearches,
      successfulSearches,
      successRate: Math.round(successRate * 10) / 10, // Round to 1 decimal
      activeUsers: activeUserCount,
      avgResponseTime,
      avgDataPoints,
      searchesByType: typeDistribution,
      typePercentages,
      dailyVolumes: dailyVolumes.map((v) => ({
        date: v.date,
        count: Number(v.count),
      })),
      peakHours,
      successRateTrends,
      userActivityTrends: uniqueUsersPerDay,
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Error fetching analytics:", error)
    return createErrorResponse(error, "Failed to fetch analytics")
  }
}
