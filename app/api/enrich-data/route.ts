import { type NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/lib/types"
import { getCurrentUser } from "@/lib/auth"
import { logSearch } from "@/lib/search-logger"
import { checkRateLimit } from "@/lib/rate-limit"
import { getConfig } from "@/lib/config"
import { correlatePersonData } from "@/lib/data-correlation"
import { createErrorResponse, ValidationError } from "@/lib/error-handler"
import { cache } from "@/lib/cache"

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let userId: string | undefined
  let userPlan: string | undefined

  try {
    // Get current user if authenticated
    try {
      const user = await getCurrentUser()
      userId = user?.id
      userPlan = user?.plan

      // Check rate limits for authenticated users
      if (userId && userPlan) {
        const rateLimitCheck = await checkRateLimit(
          userId,
          userPlan as "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE",
          "search",
        )
        if (!rateLimitCheck.allowed) {
          return NextResponse.json(
            {
              error: rateLimitCheck.reason || "Rate limit exceeded",
              remaining: rateLimitCheck.remaining,
            },
            { status: 429 },
          )
        }
      }
    } catch {
      // User not authenticated - continue without logging or rate limiting
    }

    const body = await request.json().catch(() => ({}))
    const { email, phone, name, address } = body

    if (!email && !phone && !name && !address) {
      throw new ValidationError("At least one search parameter is required")
    }

    // Check cache for comprehensive search
    const cacheKey = `comprehensive:${JSON.stringify({ email, phone, name, address })}`
    const cachedResult = await cache.get<unknown>(cacheKey)
    if (cachedResult) {
      return NextResponse.json(cachedResult)
    }

    const apiKey = getConfig().rapidApiKey
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    // Run multiple enrichment APIs in parallel
    const enrichmentPromises: Promise<ApiResponse | null>[] = []

    // Email enrichment
    if (email) {
      enrichmentPromises.push(
        fetch(`https://skip-tracing-working-api.p.rapidapi.com/search/byemail?email=${encodeURIComponent(email)}&phone=1`, {
          headers: {
            "x-rapidapi-host": "skip-tracing-working-api.p.rapidapi.com",
            "x-rapidapi-key": apiKey,
          },
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      )

      enrichmentPromises.push(
        fetch(`https://email-social-media-checker.p.rapidapi.com/check_email?email=${encodeURIComponent(email)}`, {
          headers: {
            "x-rapidapi-host": "email-social-media-checker.p.rapidapi.com",
            "x-rapidapi-key": apiKey,
          },
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      )
    }

    // Phone enrichment
    if (phone) {
      const cleanedPhone = phone.replace(/\D/g, "")
      const formattedPhone = cleanedPhone.startsWith("+") ? cleanedPhone : `+${cleanedPhone}`

      enrichmentPromises.push(
        fetch("https://virtual-phone-numbers-detector.p.rapidapi.com/check-number", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-rapidapi-host": "virtual-phone-numbers-detector.p.rapidapi.com",
            "x-rapidapi-key": apiKey,
          },
          body: JSON.stringify({ phone: formattedPhone }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      )
    }

    // Name enrichment
    if (name) {
      const [firstName, ...lastNameParts] = name.split(" ")
      const lastName = lastNameParts.join(" ")

      if (firstName && lastName) {
        const params = new URLSearchParams({
          firstName,
          lastName,
        })

        enrichmentPromises.push(
          fetch(`https://skip-tracing-working-api.p.rapidapi.com/search/byname?${params.toString()}`, {
            headers: {
              "x-rapidapi-host": "skip-tracing-working-api.p.rapidapi.com",
              "x-rapidapi-key": apiKey,
            },
          })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        )
      }
    }

    const results = await Promise.all(enrichmentPromises)

    // Use data correlation engine for better merging
    const validResults = results.filter(Boolean)
    
    // Add input data to results for cross-source matching
    const inputDataForCorrelation: Record<string, unknown> = {}
    if (email) inputDataForCorrelation.email = email
    if (phone) {
      const cleanedPhone = phone.replace(/\D/g, "")
      inputDataForCorrelation.phone = cleanedPhone.startsWith("+") ? cleanedPhone : `+${cleanedPhone}`
    }
    if (name) {
      const [firstName, ...lastNameParts] = name.split(" ")
      inputDataForCorrelation.name = name
      if (firstName) inputDataForCorrelation.firstName = firstName
      if (lastNameParts.length > 0) inputDataForCorrelation.lastName = lastNameParts.join(" ")
    }
    if (address) inputDataForCorrelation.address = address
    
    // Include input data in correlation for cross-matching
    const allSources = [...validResults, inputDataForCorrelation]
    const correlated = correlatePersonData(allSources)

    // Correlate and merge data
    const enrichedData = {
      inputData: { email, phone, name, address },
      skipTraceData: results[0],
      socialMediaData: results[1],
      phoneValidation: results[2],
      nameSearchData: results[3],
      correlatedData: correlated.correlatedData,
      confidenceScore: correlated.confidenceScore,
      dataQuality: correlated.dataQuality,
      matchingFields: correlated.matchingFields,
      conflicts: correlated.conflicts,
      summary: correlated.summary,
      insights: correlated.insights,
      dataPoints: countDataPoints(results),
      enrichedAt: new Date().toISOString(),
    }

    // Cache the result with optimized TTL for comprehensive searches
    await cache.set(cacheKey, enrichedData, cache.getComprehensiveTTL()).catch((err) => {
      console.warn("Failed to cache comprehensive search result:", err)
    })

    // Log search
    const responseTime = Date.now() - startTime
    const resultsCount = countDataPoints(results)

    await logSearch({
      userId,
      searchType: "COMPREHENSIVE",
      query: { email, phone, name, address },
      resultsCount,
      success: resultsCount > 0,
      responseTime,
    })

    return NextResponse.json(enrichedData)
  } catch (error) {
    const responseTime = Date.now() - startTime
    logSearch({
      userId,
      searchType: "COMPREHENSIVE",
      query: { email: "unknown" },
      resultsCount: 0,
      success: false,
      responseTime,
      error: error instanceof Error ? error.message : "Unknown error",
    }).catch(console.error)

    console.error("Data enrichment failed:", error)
    return createErrorResponse(error, "Failed to enrich data")
  }
}

function _calculateConfidenceScore(results: (ApiResponse | null)[]): number {
  let score = 0
  let total = 0

  results.forEach((result) => {
    if (result) {
      total++
      if (result.success || (result as { found?: boolean }).found || result.data) {
        score++
      }
    }
  })

  return total > 0 ? Math.round((score / total) * 100) : 0
}

function countDataPoints(results: (ApiResponse | null)[]): number {
  let count = 0

  results.forEach((result) => {
    if (result) {
      if (Array.isArray(result)) {
        count += result.length
      } else if (typeof result === "object") {
        count += Object.keys(result).length
      }
    }
  })

  return count
}
