import { NextResponse } from "next/server"
import { db, dbOperation } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { createErrorResponse } from "@/lib/error-handler"
import { cache } from "@/lib/cache"

// Force dynamic rendering to prevent build-time database calls
export const dynamic = "force-dynamic"

const ANALYTICS_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

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

    const cacheKey = `analytics:${user.id}:${days}:${user.plan === "ENTERPRISE" ? "all" : "own"}`
    const cached = await cache.get<Record<string, unknown>>(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    // Build where clause - admin can see all, users see only their own
    const where: { timestamp: { gte: Date }; userId?: string } = {
      timestamp: { gte: startDate },
    }

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

    // Get daily search volume via DB aggregation (no in-memory grouping)
    type DailyRow = { date: Date; count: bigint }
    const dailyRaw =
      where.userId != null
        ? await db.$queryRaw<DailyRow[]>`
          SELECT date_trunc('day', "timestamp")::date as date, count(*)::bigint as count
          FROM "SearchLog"
          WHERE "timestamp" >= ${startDate} AND "userId" = ${where.userId}
          GROUP BY 1
          ORDER BY 1 DESC
          LIMIT 30
        `
        : await db.$queryRaw<DailyRow[]>`
          SELECT date_trunc('day', "timestamp")::date as date, count(*)::bigint as count
          FROM "SearchLog"
          WHERE "timestamp" >= ${startDate}
          GROUP BY 1
          ORDER BY 1 DESC
          LIMIT 30
        `
    const dailyVolumes = dailyRaw.map((row) => {
      const d = row.date
      const dateStr = typeof d === "string" ? d : d instanceof Date ? d.toISOString() : String(d)
      return { date: dateStr.split("T")[0], count: Number(row.count) }
    })

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

    // Peak hours and success-rate/user-activity trends via raw aggregation
    type HourRow = { hour: number; count: bigint }
    type SuccessDayRow = { date: Date; total: bigint; successful: bigint }
    type UserDayRow = { date: Date; count: bigint }
    const hourQuery =
      where.userId != null
        ? db.$queryRaw<HourRow[]>`
            SELECT extract(hour from "timestamp")::int as hour, count(*)::bigint as count
            FROM "SearchLog"
            WHERE "timestamp" >= ${startDate} AND "userId" = ${where.userId}
            GROUP BY 1
            ORDER BY 2 DESC
            LIMIT 5
          `
        : db.$queryRaw<HourRow[]>`
            SELECT extract(hour from "timestamp")::int as hour, count(*)::bigint as count
            FROM "SearchLog"
            WHERE "timestamp" >= ${startDate}
            GROUP BY 1
            ORDER BY 2 DESC
            LIMIT 5
          `
    const successDayQuery =
      where.userId != null
        ? db.$queryRaw<SuccessDayRow[]>`
            SELECT date_trunc('day', "timestamp")::date as date, count(*)::bigint as total,
              sum(case when "success" then 1 else 0 end)::bigint as successful
            FROM "SearchLog"
            WHERE "timestamp" >= ${startDate} AND "userId" = ${where.userId}
            GROUP BY 1
            ORDER BY 1 DESC
            LIMIT 30
          `
        : db.$queryRaw<SuccessDayRow[]>`
            SELECT date_trunc('day', "timestamp")::date as date, count(*)::bigint as total,
              sum(case when "success" then 1 else 0 end)::bigint as successful
            FROM "SearchLog"
            WHERE "timestamp" >= ${startDate}
            GROUP BY 1
            ORDER BY 1 DESC
            LIMIT 30
          `
    const userDayQuery =
      where.userId != null
        ? db.$queryRaw<UserDayRow[]>`
            SELECT date_trunc('day', "timestamp")::date as date, count(distinct "userId")::bigint as count
            FROM "SearchLog"
            WHERE "timestamp" >= ${startDate} AND "userId" = ${where.userId}
            GROUP BY 1
            ORDER BY 1 DESC
            LIMIT 30
          `
        : db.$queryRaw<UserDayRow[]>`
            SELECT date_trunc('day', "timestamp")::date as date, count(distinct "userId")::bigint as count
            FROM "SearchLog"
            WHERE "timestamp" >= ${startDate}
            GROUP BY 1
            ORDER BY 1 DESC
            LIMIT 30
          `
    const [peakHoursRows, successRateRows, uniqueUsersRows] = await Promise.all([
      hourQuery,
      successDayQuery,
      userDayQuery,
    ])
    const toDateStr = (d: unknown) => (typeof d === "string" ? d : d instanceof Date ? d.toISOString() : String(d)).split("T")[0]
    const peakHours = peakHoursRows.map((r) => ({ hour: r.hour, count: Number(r.count) }))
    const successRateTrends = successRateRows.map((r) => ({
      date: toDateStr(r.date),
      successRate: Number(r.total) > 0 ? Math.round((Number(r.successful) / Number(r.total)) * 100) : 0,
      total: Number(r.total),
    }))
    const uniqueUsersPerDay = uniqueUsersRows.map((r) => ({
      date: toDateStr(r.date),
      count: Number(r.count),
    }))

    const payload = {
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
    }
    await cache.set(cacheKey, payload, ANALYTICS_CACHE_TTL_MS)
    return NextResponse.json(payload)
  } catch (error) {
    console.error("Error fetching analytics:", error)
    return createErrorResponse(error, "Failed to fetch analytics")
  }
}
