import { type NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/lib/types"
import { getCurrentUser } from "@/lib/auth"
import { logSearch } from "@/lib/search-logger"
import { checkRateLimit } from "@/lib/rate-limit"
import { getConfig } from "@/lib/config"
import { correlatePersonData } from "@/lib/data-correlation"
import { createErrorResponse, ValidationError } from "@/lib/error-handler"
import { cache } from "@/lib/cache"
import {
  searchByEmail,
  searchByName,
  searchByAddress,
  buildCityStateZip,
} from "@/lib/skip-trace-client"

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

    // Run multiple enrichment APIs in parallel (keyed so we can map results)
    type EnrichmentKey =
      | "emailSkipTrace"
      | "emailSocial"
      | "phoneValidation"
      | "nameSearch"
      | "addressSearch"
    const enrichmentTasks: { key: EnrichmentKey; promise: Promise<ApiResponse | null> }[] = []

    // Email enrichment (client: email, phone=1, page)
    if (email) {
      enrichmentTasks.push({
        key: "emailSkipTrace",
        promise: searchByEmail(email, "1").catch(() => null),
      })
      enrichmentTasks.push({
        key: "emailSocial",
        promise: fetch(
          `https://email-social-media-checker.p.rapidapi.com/check_email?email=${encodeURIComponent(email)}`,
          {
            headers: {
              "x-rapidapi-host": "email-social-media-checker.p.rapidapi.com",
              "x-rapidapi-key": apiKey,
            },
            signal: AbortSignal.timeout(30000),
          },
        )
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      })
    }

    // Phone enrichment
    if (phone) {
      const cleanedPhone = phone.replace(/\D/g, "")
      const formattedPhone = cleanedPhone.startsWith("+") ? cleanedPhone : `+${cleanedPhone}`

      enrichmentTasks.push({
        key: "phoneValidation",
        promise: fetch("https://virtual-phone-numbers-detector.p.rapidapi.com/check-number", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-rapidapi-host": "virtual-phone-numbers-detector.p.rapidapi.com",
            "x-rapidapi-key": apiKey,
          },
          body: JSON.stringify({ phone: formattedPhone }),
          signal: AbortSignal.timeout(30000),
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      })
    }

    // Name enrichment (client: name full string, page)
    if (name && name.trim()) {
      enrichmentTasks.push({
        key: "nameSearch",
        promise: searchByName(name.trim(), "1").catch(() => null),
      })
    }

    // Address enrichment: client byaddress (street, citystatezip, page)
    const addressParams = parseAddressForEnrichment(address)
    if (addressParams) {
      const citystatezip = buildCityStateZip(
        addressParams.city,
        addressParams.state,
        addressParams.zip,
      )
      enrichmentTasks.push({
        key: "addressSearch",
        promise: searchByAddress(
          addressParams.street,
          citystatezip || addressParams.street,
          "1",
        ).catch(() => null),
      })
    }

    const resultValues = await Promise.all(enrichmentTasks.map((t) => t.promise))
    const resultsByKey: Record<EnrichmentKey, ApiResponse | null> = {
      emailSkipTrace: null,
      emailSocial: null,
      phoneValidation: null,
      nameSearch: null,
      addressSearch: null,
    }
    enrichmentTasks.forEach((t, i) => {
      resultsByKey[t.key] = resultValues[i]
    })
    const results = resultValues

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
      skipTraceData: resultsByKey.emailSkipTrace,
      socialMediaData: resultsByKey.emailSocial,
      phoneValidation: resultsByKey.phoneValidation,
      nameSearchData: resultsByKey.nameSearch,
      addressSearchData: resultsByKey.addressSearch,
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

/**
 * Parse address input (string or object) into street, city, state, zip for byaddress API.
 * Returns null if no usable address.
 */
function parseAddressForEnrichment(
  address: unknown,
): { street: string; city?: string; state?: string; zip?: string } | null {
  if (!address) return null
  if (typeof address === "string") {
    const trimmed = address.trim()
    if (!trimmed) return null
    // Optional: try to parse "123 Main St, City, ST 12345" into parts
    const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean)
    if (parts.length >= 4) {
      const [street, city, stateZip] = [parts[0], parts[1], parts.slice(2).join(", ")]
      const stateZipMatch = stateZip?.match(/^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/)
      return {
        street,
        city: city || undefined,
        state: stateZipMatch ? stateZipMatch[1] : undefined,
        zip: stateZipMatch ? stateZipMatch[2] : undefined,
      }
    }
    if (parts.length === 3) {
      return { street: parts[0], city: parts[1], state: parts[2] }
    }
    if (parts.length === 2) {
      return { street: parts[0], city: parts[1] }
    }
    return { street: trimmed }
  }
  if (typeof address === "object" && address !== null) {
    const o = address as Record<string, unknown>
    const street = typeof o.street === "string" ? o.street.trim() : null
    if (!street) return null
    return {
      street,
      city: typeof o.city === "string" ? o.city.trim() || undefined : undefined,
      state: typeof o.state === "string" ? o.state.trim() || undefined : undefined,
      zip: typeof o.zip === "string" || typeof o.zip === "number" ? String(o.zip).trim() || undefined : undefined,
    }
  }
  return null
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
