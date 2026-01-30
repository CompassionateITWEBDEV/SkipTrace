// Utility for logging searches to the database

import { db } from "./db"
import { invalidateUsageCache } from "./rate-limit"

type SearchType = "EMAIL" | "PHONE" | "NAME" | "ADDRESS" | "COMPREHENSIVE" | "BATCH"

interface LogSearchParams {
  userId?: string
  searchType: SearchType
  query: Record<string, unknown>
  resultsCount: number
  success: boolean
  responseTime?: number
  error?: string
}

/**
 * Log a search to the database
 */
export async function logSearch(params: LogSearchParams): Promise<void> {
  try {
    await db.searchLog.create({
      data: {
        userId: params.userId || null,
        searchType: params.searchType,
        query: JSON.stringify(params.query),
        resultsCount: params.resultsCount,
        success: params.success,
        responseTime: params.responseTime || null,
        error: params.error || null,
      },
    })
    if (params.userId) {
      await invalidateUsageCache(params.userId)
    }
  } catch (error) {
    // Don't throw - logging failures shouldn't break the search
    console.error("Failed to log search:", error)
  }
}

/**
 * Count results from a search response
 */
export function countResults(data: unknown): number {
  if (!data || typeof data !== "object") {
    return 0
  }

  const obj = data as Record<string, unknown>

  // Count various result types
  let count = 0

  if (obj.skipTrace || obj.skipTraceData) {
    const skipTrace = (obj.skipTrace || obj.skipTraceData) as Record<string, unknown>
    const skipTraceData = skipTrace.data as Record<string, unknown> | undefined
    const person = skipTrace.person || skipTraceData?.person
    if (person) {
      const personData = person as Record<string, unknown>
      if (Array.isArray(personData.names)) count += personData.names.length
      if (Array.isArray(personData.phones)) count += personData.phones.length
      if (Array.isArray(personData.emails)) count += personData.emails.length
      if (Array.isArray(personData.addresses)) count += personData.addresses.length
    }
  }

  if (obj.socialMedia || obj.socialMediaData) {
    const social = (obj.socialMedia || obj.socialMediaData) as Record<string, unknown>
    count += Object.keys(social).length
  }

  if (obj.residents && Array.isArray(obj.residents)) {
    count += obj.residents.length
  }

  // If no structured data, count top-level keys as a proxy
  if (count === 0 && Object.keys(obj).length > 0) {
    count = Object.keys(obj).length
  }

  return count
}
