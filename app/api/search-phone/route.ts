import { NextResponse } from "next/server"
import { cache } from "@/lib/cache"
import { createErrorResponse, ValidationError } from "@/lib/error-handler"
import { getCurrentUser } from "@/lib/auth"
import { logSearch, countResults } from "@/lib/search-logger"
import { searchByPhone } from "@/lib/skip-trace-client"
import type { SkipTraceSearchResponse } from "@/lib/skip-trace-client"

/** Normalize Skip Tracing API PeopleDetails into the person shape SkipTraceResults expects */
function normalizePhoneSkipTraceResponse(
  raw: SkipTraceSearchResponse | null,
  searchedPhone: string
): { person: { names?: string[]; phones?: string[]; addresses?: string[]; emails?: string[] }; raw?: unknown } | null {
  if (!raw) return null
  const people = Array.isArray(raw.PeopleDetails) ? raw.PeopleDetails : []
  if (people.length === 0) return { person: { phones: [searchedPhone] }, raw }

  const first = people[0] as Record<string, unknown>
  const names: string[] = []
  if (first.Name != null && String(first.Name).trim()) names.push(String(first.Name).trim())
  const addresses: string[] = []
  if (first["Lives in"] != null && String(first["Lives in"]).trim()) addresses.push(String(first["Lives in"]).trim())
  if (first["Used to live in"] != null && String(first["Used to live in"]).trim()) addresses.push(String(first["Used to live in"]).trim())
  const phones: string[] = [searchedPhone]
  if (first.Phone != null && String(first.Phone).trim()) phones.push(String(first.Phone).trim())
  if (first["Phone Number"] != null && String(first["Phone Number"]).trim()) phones.push(String(first["Phone Number"]).trim())
  const emails: string[] = []
  if (first.Email != null && String(first.Email).trim()) emails.push(String(first.Email).trim())
  if (first["Email"] != null && String(first["Email"]).trim()) emails.push(String(first["Email"]).trim())

  return {
    person: {
      ...(names.length > 0 && { names }),
      ...(phones.length > 0 && { phones }),
      ...(addresses.length > 0 && { addresses }),
      ...(emails.length > 0 && { emails }),
    },
    raw,
  }
}

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
    const { phone, skipCache } = body

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

    // Check cache first (skip if skipCache: true — e.g. to refresh after a previously cached empty/failed result)
    const cacheKey = cache.getPhoneKey(cleanedPhone)
    if (!skipCache) {
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
    }

    const apiKey = process.env.RAPIDAPI_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    // Format phone for skip-trace API: match working RapidAPI format (XXX)XXX-XXXX for US.
    let phonenoForSkipTrace: string
    const digitsOnly = cleanedPhone.replace(/\D/g, "")
    if (cleanedPhone.startsWith("+1") && (digitsOnly.length === 10 || digitsOnly.length === 11)) {
      const tenDigits = digitsOnly.length === 11 ? digitsOnly.slice(1) : digitsOnly
      phonenoForSkipTrace = `(${tenDigits.slice(0, 3)})${tenDigits.slice(3, 6)}-${tenDigits.slice(6)}`
    } else {
      phonenoForSkipTrace = cleanedPhone // International: keep E.164
    }

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
      // Phone geolocation (optional; requires NUMVERIFY_API_KEY in .env)
      process.env.NUMVERIFY_API_KEY
        ? fetch(`https://api.numverify.com/v1/validate?access_key=${process.env.NUMVERIFY_API_KEY}&number=${encodeURIComponent(cleanedPhone)}&country_code=&format=1`, {
            method: "GET",
            signal: AbortSignal.timeout(10000), // 10 second timeout
          })
        : Promise.resolve(null as unknown as Response),
    ])

    // Process virtual phone check
    if (virtualCheckResponse.status === "fulfilled" && virtualCheckResponse.value.ok) {
      try {
        virtualCheckData = await virtualCheckResponse.value.json()
      } catch (error) {
        console.error("[phone-search] Virtual phone check: failed to parse JSON", error)
      }
    } else if (virtualCheckResponse.status === "fulfilled") {
      const res = virtualCheckResponse.value
      console.warn(
        "[phone-search] Virtual phone detector API:",
        res.status,
        res.statusText,
        res.url,
      )
    } else if (virtualCheckResponse.status === "rejected") {
      console.error("[phone-search] Virtual phone check rejected:", virtualCheckResponse.reason)
    }

    // Process geolocation data
    if (geolocationResponse.status === "fulfilled" && geolocationResponse.value && geolocationResponse.value.ok) {
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
        console.error("[phone-search] Numverify/geolocation: failed to parse response", error)
      }
    } else if (geolocationResponse.status === "fulfilled" && geolocationResponse.value) {
      const res = geolocationResponse.value
      console.warn("[phone-search] Numverify/geolocation API:", res.status, res.statusText)
    } else if (geolocationResponse.status === "rejected") {
      console.warn("[phone-search] Numverify/geolocation rejected:", geolocationResponse.reason)
    }

    // Try skip trace API via shared client (phoneno + page)
    try {
      const rawSkipTrace = await searchByPhone(phonenoForSkipTrace, "1")
      // Normalize raw API response (PeopleDetails) so the UI can display it
      skipTraceData = normalizePhoneSkipTraceResponse(rawSkipTrace, cleanedPhone) ?? rawSkipTrace
    } catch (error) {
      if (error && typeof error === "object" && "response" in error) {
        const axErr = error as { response?: { status?: number; statusText?: string } }
        const status = axErr.response?.status
        const statusText = axErr.response?.statusText
        console.warn("[phone-search] Skip trace API response:", status, statusText)
        if (status === 403) {
          apiWarning = "Phone skip tracing requires additional API subscription. Showing virtual phone detection results."
        }
      } else {
        console.error("[phone-search] Skip trace API error (no response):", error)
      }
      if (!skipTraceData) {
        console.error("[phone-search] Skip trace phone API error:", error)
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
