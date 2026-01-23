// Rate limiting based on user plans

import { db } from "./db"
import type { Plan } from "@prisma/client"

interface PlanLimits {
  searchesPerMonth: number
  searchesPerDay: number
  batchSize: number
  apiCallsPerMinute: number
}

const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    searchesPerMonth: 50,
    searchesPerDay: 5,
    batchSize: 10,
    apiCallsPerMinute: 10,
  },
  STARTER: {
    searchesPerMonth: 500,
    searchesPerDay: 50,
    batchSize: 100,
    apiCallsPerMinute: 30,
  },
  PROFESSIONAL: {
    searchesPerMonth: 5000,
    searchesPerDay: 500,
    batchSize: 1000,
    apiCallsPerMinute: 100,
  },
  ENTERPRISE: {
    searchesPerMonth: 100000,
    searchesPerDay: 10000,
    batchSize: 10000,
    apiCallsPerMinute: 1000,
  },
}

/**
 * Check if user has exceeded their rate limit
 */
export async function checkRateLimit(
  userId: string,
  plan: Plan,
  searchType: "search" | "batch",
  batchSize?: number,
): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  const limits = PLAN_LIMITS[plan]

  // Check monthly limit
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const monthlySearches = await db.searchLog.count({
    where: {
      userId,
      timestamp: { gte: startOfMonth },
    },
  })

  if (monthlySearches >= limits.searchesPerMonth) {
    return {
      allowed: false,
      reason: `Monthly limit of ${limits.searchesPerMonth} searches exceeded`,
      remaining: 0,
    }
  }

  // Check daily limit
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const dailySearches = await db.searchLog.count({
    where: {
      userId,
      timestamp: { gte: startOfDay },
    },
  })

  if (dailySearches >= limits.searchesPerDay) {
    return {
      allowed: false,
      reason: `Daily limit of ${limits.searchesPerDay} searches exceeded`,
      remaining: 0,
    }
  }

  // For batch searches, check batch size limit
  if (searchType === "batch" && batchSize) {
    if (batchSize > limits.batchSize) {
      return {
        allowed: false,
        reason: `Batch size limit of ${limits.batchSize} exceeded. Your plan allows batches up to ${limits.batchSize} items.`,
        remaining: limits.batchSize,
      }
    }

    // Check if batch would exceed monthly limit
    if (monthlySearches + batchSize > limits.searchesPerMonth) {
      return {
        allowed: false,
        reason: `This batch would exceed your monthly limit. Remaining: ${limits.searchesPerMonth - monthlySearches}`,
        remaining: limits.searchesPerMonth - monthlySearches,
      }
    }
  }

  return {
    allowed: true,
    remaining: limits.searchesPerMonth - monthlySearches,
  }
}

/**
 * Get user's current usage statistics
 */
export async function getUserUsage(userId: string): Promise<{
  monthly: { used: number; limit: number; remaining: number }
  daily: { used: number; limit: number; remaining: number }
}> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  })

  if (!user) {
    throw new Error("User not found")
  }

  const limits = PLAN_LIMITS[user.plan]

  // Monthly usage
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const monthlyUsed = await db.searchLog.count({
    where: {
      userId,
      timestamp: { gte: startOfMonth },
    },
  })

  // Daily usage
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const dailyUsed = await db.searchLog.count({
    where: {
      userId,
      timestamp: { gte: startOfDay },
    },
  })

  return {
    monthly: {
      used: monthlyUsed,
      limit: limits.searchesPerMonth,
      remaining: Math.max(0, limits.searchesPerMonth - monthlyUsed),
    },
    daily: {
      used: dailyUsed,
      limit: limits.searchesPerDay,
      remaining: Math.max(0, limits.searchesPerDay - dailyUsed),
    },
  }
}
