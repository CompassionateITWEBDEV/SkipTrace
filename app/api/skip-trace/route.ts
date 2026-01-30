import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { logSearch, countResults } from "@/lib/search-logger"
import { createErrorResponse, ExternalApiError, ValidationError } from "@/lib/error-handler"
import { cache } from "@/lib/cache"
import { checkEmailBreach, checkEmailReputation } from "@/lib/email-utils"
import { deduplicateRequest, generateDedupKey } from "@/lib/request-deduplication"
import { searchWithFailover } from "@/lib/api-providers"

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let userId: string | undefined
  let email = ""

  try {
    // Get current user if authenticated
    try {
      const user = await getCurrentUser()
      userId = user?.id
    } catch {
      // User not authenticated - continue without logging
    }

    const body = await request.json().catch(() => ({}))
    email = body.email

    if (!email || typeof email !== "string" || !email.includes("@")) {
      throw new ValidationError("Valid email is required", "email")
    }

    // Check cache first
    const cacheKey = cache.getSkipTraceKey(email)
    const cachedResult = await cache.get<{
      skipTrace: unknown
      socialMedia: unknown
      email: string
      searchedAt: string
    }>(cacheKey)

    if (cachedResult) {
      // Return cached result
      return NextResponse.json(cachedResult)
    }

    const apiKey = process.env.RAPIDAPI_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    // Use request deduplication to prevent duplicate API calls
    const dedupKey = generateDedupKey("email-search", { email })

    const socialUrl = `https://email-social-media-checker.p.rapidapi.com/check_email?email=${encodeURIComponent(email)}`

    // Skip-trace via provider layer (circuit breaker + fallback); social, breach, reputation in parallel
    const [skipTraceResult, socialResponse, breachData, emailReputation] = await deduplicateRequest(
      dedupKey,
      () =>
        Promise.all([
          searchWithFailover((provider) => provider.searchByEmail(email), { timeout: 30000 })
            .then((r) => r.data)
            .catch((err) => {
              const msg = err instanceof Error ? err.message : String(err)
              console.warn("[skip-trace] Skip trace API failed:", msg)
              if (err && typeof err === "object" && "response" in err) {
                const res = (err as { response?: { status?: number; statusText?: string } }).response
                if (res) console.warn("[skip-trace] Skip trace API response:", res.status, res.statusText)
              }
              return null
            }),
          fetch(socialUrl, {
            method: "GET",
            headers: {
              "x-rapidapi-host": "email-social-media-checker.p.rapidapi.com",
              "x-rapidapi-key": apiKey,
            },
            signal: AbortSignal.timeout(30000),
          }),
          checkEmailBreach(email).catch(() => ({ breached: false, error: "Breach check unavailable" })),
          checkEmailReputation(email).catch(() => ({ deliverable: true, riskScore: 0.5 })),
        ]),
    )

    const skipTraceData = skipTraceResult

    let socialData: unknown = null
    if (socialResponse.ok) {
      try {
        socialData = await socialResponse.json()
      } catch (err) {
        console.error("[skip-trace] Failed to parse social media response:", err)
      }
    } else {
      console.warn(
        "[skip-trace] Social media API:",
        socialResponse.status,
        socialResponse.statusText,
        socialResponse.url,
      )
    }

    // If both APIs failed, return an error
    if (!skipTraceData && !socialData) {
      const responseTime = Date.now() - startTime
      await logSearch({
        userId,
        searchType: "EMAIL",
        query: { email },
        resultsCount: 0,
        success: false,
        responseTime,
        error: "Both APIs failed",
      }).catch(console.error)
      throw new ExternalApiError(
        "Failed to retrieve data from skip trace and social media APIs. Check server logs for [skip-trace] (status codes). Ensure RAPIDAPI_KEY is set and you are subscribed to Skip Tracing Working API and Email Social Media Checker on RapidAPI.",
        502,
      )
    }

    // Use breach and reputation data from parallel fetch
    const breachCheck = breachData as { breached: boolean; breachCount?: number; breaches?: unknown[]; error?: string } | null
    const reputationCheck = emailReputation as { deliverable: boolean; riskScore?: number; domain?: string; suggestions?: string[] } | null

    // Optional confidence score (0–100) based on data completeness
    let confidenceScore: number | undefined
    if (skipTraceData && typeof skipTraceData === "object") {
      const st = skipTraceData as { person?: { names?: unknown[]; emails?: unknown[]; phones?: unknown[]; addresses?: unknown[] } }
      const p = st.person
      if (p) {
        let score = 0
        if (Array.isArray(p.names) && p.names.length > 0) score += 25
        if (Array.isArray(p.emails) && p.emails.length > 0) score += 25
        if (Array.isArray(p.phones) && p.phones.length > 0) score += 25
        if (Array.isArray(p.addresses) && p.addresses.length > 0) score += 25
        if (socialData && typeof socialData === "object" && Object.keys(socialData).length > 0) score = Math.min(100, score + 15)
        confidenceScore = score
      }
    }

    const responseData = {
      skipTrace: skipTraceData,
      socialMedia: socialData,
      email: email,
      ...(confidenceScore !== undefined && { confidenceScore }),
      emailHealth: {
        ...(breachCheck && !breachCheck.error && { breachCheck }),
        ...(reputationCheck && { reputation: reputationCheck }),
      },
      searchedAt: new Date().toISOString(),
    }

    // Cache the result with optimized TTL for email searches
    await cache.set(cacheKey, responseData, cache.getEmailTTL()).catch((err) => {
      console.warn("Failed to cache result:", err)
      // Don't fail the request if caching fails
    })

    // Log successful search
    const responseTime = Date.now() - startTime
    const resultsCount = countResults(responseData)

    await logSearch({
      userId,
      searchType: "EMAIL",
      query: { email },
      resultsCount,
      success: true,
      responseTime,
    })

    return NextResponse.json(responseData)
  } catch (error) {
    const responseTime = Date.now() - startTime
    // Log error asynchronously to avoid blocking response
    logSearch({
      userId,
      searchType: "EMAIL",
      query: { email: email || "unknown" },
      resultsCount: 0,
      success: false,
      responseTime,
      error: error instanceof Error ? error.message : "Unknown error",
    }).catch(console.error)

    console.error("Skip trace failed:", error)
    return createErrorResponse(error, "Failed to perform skip trace")
  }
}
