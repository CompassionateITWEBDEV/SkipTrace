// Advanced analytics engine for predictive analytics and custom reports

import { db, dbOperation } from "./db"
import type { SearchType } from "@prisma/client"

export interface AnalyticsMetrics {
  totalSearches: number
  successfulSearches: number
  successRate: number
  avgResponseTime: number
  searchesByType: Record<string, number>
  searchesByHour: Array<{ hour: number; count: number }>
  topQueries: Array<{ query: string; count: number }>
  successRateByType: Record<string, number>
}

export interface PredictiveMetrics {
  predictedSuccessRate: number
  confidence: number
  factors: Array<{ factor: string; impact: number }>
}

/**
 * Get comprehensive analytics metrics
 */
export async function getAnalyticsMetrics(
  userId?: string,
  days: number = 30,
): Promise<AnalyticsMetrics> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const where: { timestamp: { gte: Date }; userId?: string } = {
    timestamp: { gte: startDate },
  }

  if (userId) {
    where.userId = userId
  }

  // Get all search logs
  const logs = await dbOperation(
    () =>
      db.searchLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
      }),
    [],
  )

  const totalSearches = logs.length
  const successfulSearches = logs.filter((log) => log.success).length
  const successRate = totalSearches > 0 ? (successfulSearches / totalSearches) * 100 : 0

  // Calculate average response time
  const responseTimes = logs
    .map((log) => log.responseTime)
    .filter((rt): rt is number => rt !== null)
  const avgResponseTime =
    responseTimes.length > 0
      ? Math.round(responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length)
      : 0

  // Group by search type
  const searchesByType: Record<string, number> = {}
  logs.forEach((log) => {
    const type = log.searchType
    searchesByType[type] = (searchesByType[type] || 0) + 1
  })

  // Group by hour of day
  const searchesByHour: Array<{ hour: number; count: number }> = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: 0,
  }))
  logs.forEach((log) => {
    const hour = log.timestamp.getHours()
    searchesByHour[hour].count++
  })

  // Get top queries
  const queryCounts: Record<string, number> = {}
  logs.forEach((log) => {
    const query = log.query
    queryCounts[query] = (queryCounts[query] || 0) + 1
  })
  const topQueries = Object.entries(queryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([query, count]) => ({ query, count }))

  // Calculate success rate by type
  const successRateByType: Record<string, number> = {}
  Object.keys(searchesByType).forEach((type) => {
    const typeLogs = logs.filter((log) => log.searchType === type)
    const typeSuccess = typeLogs.filter((log) => log.success).length
    successRateByType[type] =
      typeLogs.length > 0 ? (typeSuccess / typeLogs.length) * 100 : 0
  })

  return {
    totalSearches,
    successfulSearches,
    successRate: Math.round(successRate * 10) / 10,
    avgResponseTime,
    searchesByType,
    searchesByHour,
    topQueries,
    successRateByType,
  }
}

/**
 * Predict success rate for a search based on historical data
 */
export async function predictSearchSuccess(
  searchType: SearchType,
  query: string,
  userId?: string,
): Promise<PredictiveMetrics> {
  // Get historical data for similar searches
  const similarLogs = await dbOperation(
    () =>
      db.searchLog.findMany({
        where: {
          searchType,
          userId: userId || undefined,
          timestamp: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
          },
        },
        take: 100,
      }),
    [],
  )

  if (similarLogs.length === 0) {
    return {
      predictedSuccessRate: 50, // Default if no data
      confidence: 0,
      factors: [],
    }
  }

  // Calculate historical success rate
  const successCount = similarLogs.filter((log) => log.success).length
  const historicalSuccessRate = (successCount / similarLogs.length) * 100

  // Analyze factors
  const factors: Array<{ factor: string; impact: number }> = []

  // Factor: Search type success rate
  const typeSuccessRate = historicalSuccessRate
  factors.push({
    factor: `${searchType} search historical success rate`,
    impact: typeSuccessRate > 70 ? 0.3 : typeSuccessRate > 50 ? 0.2 : 0.1,
  })

  // Factor: Query length/complexity
  const queryLength = query.length
  if (queryLength > 20) {
    factors.push({
      factor: "Query complexity (longer queries tend to be more specific)",
      impact: 0.2,
    })
  }

  // Factor: Recent success trend
  const recentLogs = similarLogs.slice(0, 10)
  const recentSuccessRate =
    recentLogs.length > 0
      ? (recentLogs.filter((log) => log.success).length / recentLogs.length) * 100
      : historicalSuccessRate

  if (recentSuccessRate > historicalSuccessRate + 10) {
    factors.push({
      factor: "Improving success trend",
      impact: 0.15,
    })
  } else if (recentSuccessRate < historicalSuccessRate - 10) {
    factors.push({
      factor: "Declining success trend",
      impact: -0.15,
    })
  }

  // Calculate predicted success rate
  const baseRate = historicalSuccessRate
  const adjustments = factors.reduce((sum, f) => sum + f.impact * 100, 0)
  const predictedSuccessRate = Math.max(0, Math.min(100, baseRate + adjustments))

  // Calculate confidence based on sample size
  const confidence = Math.min(100, (similarLogs.length / 100) * 100)

  return {
    predictedSuccessRate: Math.round(predictedSuccessRate * 10) / 10,
    confidence: Math.round(confidence * 10) / 10,
    factors,
  }
}

/**
 * Generate custom report based on filters
 */
export async function generateCustomReport(filters: {
  userId?: string
  startDate?: Date
  endDate?: Date
  searchTypes?: SearchType[]
  minSuccessRate?: number
}): Promise<{
  summary: AnalyticsMetrics
  details: Array<{
    timestamp: Date
    searchType: SearchType
    query: string
    success: boolean
    responseTime: number | null
  }>
}> {
  const where: {
    timestamp?: { gte?: Date; lte?: Date }
    userId?: string
    searchType?: { in: SearchType[] }
    success?: boolean
  } = {}

  if (filters.startDate || filters.endDate) {
    where.timestamp = {}
    if (filters.startDate) where.timestamp.gte = filters.startDate
    if (filters.endDate) where.timestamp.lte = filters.endDate
  }

  if (filters.userId) {
    where.userId = filters.userId
  }

  if (filters.searchTypes && filters.searchTypes.length > 0) {
    where.searchType = { in: filters.searchTypes }
  }

  const logs = await dbOperation(
    () =>
      db.searchLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
      }),
    [],
  )

  // Filter by success rate if specified
  let filteredLogs = logs
  if (filters.minSuccessRate !== undefined) {
    // This would require grouping - simplified for now
    filteredLogs = logs
  }

  const summary = await getAnalyticsMetrics(filters.userId, 30)

  return {
    summary,
    details: filteredLogs.map((log) => ({
      timestamp: log.timestamp,
      searchType: log.searchType,
      query: log.query,
      success: log.success,
      responseTime: log.responseTime,
    })),
  }
}
