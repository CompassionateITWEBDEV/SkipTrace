// Rate limiting based on user plans
// Uses optional cache (Redis or in-memory) to avoid repeated DB counts per period

import { db } from "./db"
import { cache } from "./cache"

/** TTL for cached usage counts (ms). Short to keep rate limits accurate while reducing DB load. */
const RATE_LIMIT_CACHE_TTL_MS = 60 * 1000 // 1 minute

type Plan = "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE"

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

function monthKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}
function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Invalidate cached usage counts for a user so next rate-limit check uses fresh DB counts. Call after logging a search. */
export async function invalidateUsageCache(userId: string): Promise<void> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  await Promise.all([
    cache.delete(`ratelimit:month:${userId}:${monthKey(startOfMonth)}`).catch(() => {}),
    cache.delete(`ratelimit:day:${userId}:${dayKey(startOfDay)}`).catch(() => {}),
  ])
}

async function getMonthlyCount(userId: string): Promise<number> {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const key = `ratelimit:month:${userId}:${monthKey(startOfMonth)}`
  const cached = await cache.get<number>(key)
  if (typeof cached === "number") return cached
  const count = await db.searchLog.count({
    where: { userId, timestamp: { gte: startOfMonth } },
  })
  await cache.set(key, count, RATE_LIMIT_CACHE_TTL_MS).catch(() => {})
  return count
}

async function getDailyCount(userId: string): Promise<number> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const key = `ratelimit:day:${userId}:${dayKey(startOfDay)}`
  const cached = await cache.get<number>(key)
  if (typeof cached === "number") return cached
  const count = await db.searchLog.count({
    where: { userId, timestamp: { gte: startOfDay } },
  })
  await cache.set(key, count, RATE_LIMIT_CACHE_TTL_MS).catch(() => {})
  return count
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

  const monthlySearches = await getMonthlyCount(userId)
  if (monthlySearches >= limits.searchesPerMonth) {
    return {
      allowed: false,
      reason: `Monthly limit of ${limits.searchesPerMonth} searches exceeded`,
      remaining: 0,
    }
  }

  const dailySearches = await getDailyCount(userId)
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
 * Get user's current usage statistics (uses same cache as checkRateLimit)
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
  const [monthlyUsed, dailyUsed] = await Promise.all([
    getMonthlyCount(userId),
    getDailyCount(userId),
  ])

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
