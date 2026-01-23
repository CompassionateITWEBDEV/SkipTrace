import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { logSearch, countResults } from "@/lib/search-logger"
import { createErrorResponse, ExternalApiError, ValidationError } from "@/lib/error-handler"
import { cache } from "@/lib/cache"
import { checkEmailBreach, checkEmailReputation } from "@/lib/email-utils"
import { deduplicateRequest, generateDedupKey } from "@/lib/request-deduplication"

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
    
    // Call APIs in parallel for better performance (skip-trace, social media, breach check)
    const skipTraceUrl = `https://skip-tracing-working-api.p.rapidapi.com/search/byemail?email=${encodeURIComponent(email)}&phone=1`
    const socialUrl = `https://email-social-media-checker.p.rapidapi.com/check_email?email=${encodeURIComponent(email)}`

    const [skipTraceResponse, socialResponse, breachData, emailReputation] = await deduplicateRequest(
      dedupKey,
      () => Promise.all([
        fetch(skipTraceUrl, {
          method: "GET",
          headers: {
            "x-rapidapi-host": "skip-tracing-working-api.p.rapidapi.com",
            "x-rapidapi-key": apiKey,
          },
          signal: AbortSignal.timeout(30000), // 30 second timeout
        }).catch((err) => {
          throw new ExternalApiError(`Skip trace API request failed: ${err.message}`, undefined, err)
        }),
        fetch(socialUrl, {
          method: "GET",
          headers: {
            "x-rapidapi-host": "email-social-media-checker.p.rapidapi.com",
            "x-rapidapi-key": apiKey,
          },
          signal: AbortSignal.timeout(30000), // 30 second timeout
        }).catch((err) => {
          throw new ExternalApiError(`Social media API request failed: ${err.message}`, undefined, err)
        }),
        // Email breach check (non-blocking - don't fail if this fails)
        checkEmailBreach(email).catch(() => ({ breached: false, error: "Breach check unavailable" })),
        // Email reputation check (non-blocking)
        checkEmailReputation(email).catch(() => ({ deliverable: true, riskScore: 0.5 })),
      ]),
    )

    // Handle skip trace response
    let skipTraceData = null
    if (!skipTraceResponse.ok) {
      const errorText = await skipTraceResponse.text().catch(() => "Unknown error")
      console.error(`Skip trace API failed (${skipTraceResponse.status}): ${errorText}`)
      // Don't throw - continue with social media data if available
    } else {
      try {
        skipTraceData = await skipTraceResponse.json()
      } catch (err) {
        console.error("Failed to parse skip trace response:", err)
      }
    }

    // Handle social media response
    let socialData = null
    if (socialResponse.ok) {
      try {
        socialData = await socialResponse.json()
      } catch (err) {
        console.error("Failed to parse social media response:", err)
      }
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
        "Failed to retrieve data from skip trace and social media APIs",
        502,
      )
    }

    // Use breach and reputation data from parallel fetch
    const breachCheck = breachData as { breached: boolean; breachCount?: number; breaches?: unknown[]; error?: string } | null
    const reputationCheck = emailReputation as { deliverable: boolean; riskScore?: number; domain?: string; suggestions?: string[] } | null

    const responseData = {
      skipTrace: skipTraceData,
      socialMedia: socialData,
      email: email,
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
