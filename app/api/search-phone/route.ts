import { NextResponse } from "next/server"
import { cache } from "@/lib/cache"
import { createErrorResponse, ValidationError } from "@/lib/error-handler"
import { getCurrentUser } from "@/lib/auth"
import { logSearch, countResults } from "@/lib/search-logger"
import { searchByPhone } from "@/lib/skip-trace-client"

export async function POST(request: Request) {
  const startTime = Date.now()
  let userId: string | undefined

  try {
    // Get current user if authenticated
    try {
      const user = await getCurrentUser()
      userId = user?.id
    } catch {
      // User not authenticated - continue without logging
    }

    const body = await request.json().catch(() => ({}))
    const { phone } = body

    if (!phone || typeof phone !== "string" || phone.trim().length === 0) {
      throw new ValidationError("Phone number is required", "phone")
    }

    // Clean phone number
    let cleanedPhone = phone.replace(/[\s\-().]/g, "")
    if (!cleanedPhone.startsWith("+")) {
      if (cleanedPhone.length === 10) {
        cleanedPhone = "+1" + cleanedPhone
      } else {
        cleanedPhone = "+" + cleanedPhone
      }
    }

    // Check cache first
    const cacheKey = cache.getPhoneKey(cleanedPhone)
    const cachedResult = await cache.get<{
      success: boolean
      searchType: string
      query: unknown
      skipTraceData: unknown
      virtualCheck: unknown
      warning?: string | null
      searchPerformed: string
    }>(cacheKey)

    if (cachedResult) {
      return NextResponse.json(cachedResult)
    }

    const apiKey = process.env.RAPIDAPI_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    // Format phone for skip-trace API (phoneno): accept (214)349-3972 style or cleaned
    const phonenoForSkipTrace = phone.trim()

    // Call virtual phone detector and geolocation services in parallel
    let virtualCheckData = null
    let skipTraceData = null
    let geolocationData = null
    let apiWarning = null

    // Parallel API calls for better performance
    const [virtualCheckResponse, geolocationResponse] = await Promise.allSettled([
      // Virtual phone detector
      fetch("https://virtual-phone-numbers-detector.p.rapidapi.com/check-number", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-host": "virtual-phone-numbers-detector.p.rapidapi.com",
          "x-rapidapi-key": apiKey,
        },
        body: JSON.stringify({ phone: cleanedPhone }),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      }),
      // Phone geolocation lookup (using Numverify API if available, or similar service)
      // Note: This requires NUMVERIFY_API_KEY in environment variables
      process.env.NUMVERIFY_API_KEY
        ? fetch(`https://api.numverify.com/v1/validate?access_key=${process.env.NUMVERIFY_API_KEY}&number=${encodeURIComponent(cleanedPhone)}&country_code=&format=1`, {
            method: "GET",
            signal: AbortSignal.timeout(10000), // 10 second timeout
          })
        : Promise.reject(new Error("Numverify API key not configured")),
    ])

    // Process virtual phone check
    if (virtualCheckResponse.status === "fulfilled" && virtualCheckResponse.value.ok) {
      try {
        virtualCheckData = await virtualCheckResponse.value.json()
      } catch (error) {
        console.error("Failed to parse virtual phone check response:", error)
      }
    } else if (virtualCheckResponse.status === "rejected") {
      console.error("Virtual phone check error:", virtualCheckResponse.reason)
    }

    // Process geolocation data
    if (geolocationResponse.status === "fulfilled" && geolocationResponse.value.ok) {
      try {
        const geoData = await geolocationResponse.value.json()
        if (geoData.valid) {
          geolocationData = {
            country: geoData.country_name,
            countryCode: geoData.country_code,
            location: geoData.location || geoData.line_type,
            carrier: geoData.carrier || geoData.carrier_name,
            lineType: geoData.line_type,
            localFormat: geoData.local_format,
            internationalFormat: geoData.international_format,
          }
        }
      } catch (error) {
        console.error("Failed to parse geolocation response:", error)
      }
    }

    // Try skip trace API via shared client (phoneno + page)
    try {
      skipTraceData = await searchByPhone(phonenoForSkipTrace, "1")
    } catch (error) {
      if (error && typeof error === "object" && "response" in error) {
        const axErr = error as { response?: { status?: number } }
        if (axErr.response?.status === 403) {
          apiWarning = "Phone skip tracing requires additional API subscription. Showing virtual phone detection results."
        }
      }
      if (!skipTraceData) {
        console.error("Skip trace phone API error:", error)
      }
    }

    // Merge geolocation data into virtualCheck if available
    const enhancedVirtualCheck = virtualCheckData
      ? {
          ...virtualCheckData,
          ...(geolocationData && {
            country: geolocationData.country || virtualCheckData.country,
            countryCode: geolocationData.countryCode || virtualCheckData.country_code || virtualCheckData.countryCode,
            location: geolocationData.location || virtualCheckData.location,
            carrier: geolocationData.carrier || virtualCheckData.carrier,
            lineType: geolocationData.lineType || virtualCheckData.line_type || virtualCheckData.lineType,
            localFormat: geolocationData.localFormat,
            internationalFormat: geolocationData.internationalFormat,
          }),
        }
      : geolocationData || null

    const responseData = {
      success: true,
      searchType: "phone",
      query: { phone: cleanedPhone },
      skipTraceData,
      virtualCheck: enhancedVirtualCheck,
      geolocation: geolocationData || undefined,
      warning: apiWarning,
      searchPerformed: new Date().toISOString(),
    }

    // Cache the result with optimized TTL for phone searches
    await cache.set(cacheKey, responseData, cache.getPhoneTTL()).catch((err) => {
      console.warn("Failed to cache phone search result:", err)
    })

    // Log successful search
    const responseTime = Date.now() - startTime
    const resultsCount = countResults(responseData)

    await logSearch({
      userId,
      searchType: "PHONE",
      query: { phone: cleanedPhone },
      resultsCount,
      success: true,
      responseTime,
    }).catch(console.error)

    return NextResponse.json(responseData)
  } catch (error) {
    const responseTime = Date.now() - startTime
    logSearch({
      userId,
      searchType: "PHONE",
      query: { phone: "unknown" },
      resultsCount: 0,
      success: false,
      responseTime,
      error: error instanceof Error ? error.message : "Unknown error",
    }).catch(console.error)

    console.error("Phone search error:", error)
    return createErrorResponse(error, "Failed to search by phone")
  }
}
