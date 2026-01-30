import { NextResponse } from "next/server"
import { cache } from "@/lib/cache"
import { createErrorResponse, ValidationError, ExternalApiError } from "@/lib/error-handler"
import { getCurrentUser } from "@/lib/auth"
import { logSearch, countResults } from "@/lib/search-logger"
import { searchByName } from "@/lib/skip-trace-client"

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
    const { firstName, lastName, middleName, city, state, age, dateOfBirth: _dateOfBirth } = body

    if (!firstName || !lastName || typeof firstName !== "string" || typeof lastName !== "string") {
      throw new ValidationError("First name and last name are required")
    }

    // Check cache first
    const cacheKey = cache.getNameKey(firstName, lastName, city, state)
    const cachedResult = await cache.get<{
      success: boolean
      searchType: string
      query: unknown
      skipTraceData: unknown
      socialData: unknown
      possibleEmails: string[]
      searchPerformed: string
    }>(cacheKey)

    if (cachedResult) {
      return NextResponse.json(cachedResult)
    }

    const name = [firstName.trim(), middleName && typeof middleName === "string" ? middleName.trim() : "", lastName.trim()]
      .filter(Boolean)
      .join(" ")

    const apiKey = process.env.RAPIDAPI_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    let skipTraceData: unknown = null
    let multipleResults: unknown[] = []
    try {
      const responseData = await searchByName(name, "1")
      skipTraceData = responseData
      // Prefer PeopleDetails (official API shape), then fallback to legacy shapes
      if (Array.isArray(responseData.PeopleDetails)) {
        multipleResults = responseData.PeopleDetails
      } else if (Array.isArray(responseData)) {
        multipleResults = responseData
        skipTraceData = responseData[0] ?? responseData
      } else if (responseData.persons && Array.isArray(responseData.persons)) {
        multipleResults = responseData.persons
        skipTraceData = responseData.persons[0]
      } else if (responseData.results && Array.isArray(responseData.results)) {
        multipleResults = responseData.results
        skipTraceData = responseData.results[0]
      } else {
        multipleResults = responseData.PeopleDetails ? [...(responseData.PeopleDetails as unknown[])] : []
      }
    } catch (err) {
      throw new ExternalApiError(
        `Name search API request failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        undefined,
        err,
      )
    }

    // Also check social media with common email patterns
    const emailVariations = [
      `${firstName.toLowerCase()}${lastName.toLowerCase()}@gmail.com`,
      `${firstName.toLowerCase()}.${lastName.toLowerCase()}@gmail.com`,
    ]

    let socialData = null
    try {
      const socialResponse = await fetch(
        `https://email-social-media-checker.p.rapidapi.com/check_email?email=${encodeURIComponent(emailVariations[0])}`,
        {
          method: "GET",
          headers: {
            "x-rapidapi-host": "email-social-media-checker.p.rapidapi.com",
            "x-rapidapi-key": apiKey,
          },
        },
      )
      if (socialResponse.ok) {
        socialData = await socialResponse.json()
      }
    } catch (e) {
      console.error("Social media check failed:", e)
    }

    const socialPlatforms = socialData
      ? Object.entries(socialData)
          .filter(([_key, value]: [string, unknown]) => {
            const val = value as { registered?: boolean } | null
            return val?.registered === true
          })
          .map(([key, value]: [string, unknown]) => {
            const val = value as { username?: string; url?: string } | null
            return {
              platform: key,
              username: val?.username || null,
              url: val?.url || null,
            }
          })
      : []

    // Score and rank multiple results if available
    let rankedResults: Array<{ person: unknown; confidence: number; age?: number; location?: string }> = []
    if (multipleResults.length > 1) {
      rankedResults = multipleResults.map((result: unknown) => {
        const person = (result as { person?: unknown }).person || result
        const personObj = person as Record<string, unknown>
        // PeopleDetails shape: Name, Age, Lives in, Person ID, Link, Related to
        const names = Array.isArray(personObj.names)
          ? personObj.names
          : personObj.Name != null
            ? [personObj.Name]
            : []
        const addresses = Array.isArray(personObj.addresses)
          ? personObj.addresses
          : personObj["Lives in"] != null
            ? [personObj["Lives in"]]
            : []
        const ageVal = personObj.age ?? personObj.Age
        const personAge = typeof ageVal === "number" ? ageVal : typeof ageVal === "string" ? parseInt(String(ageVal), 10) : undefined

        // Calculate confidence score based on matching criteria
        let confidence = 0.5 // Base confidence

        // Check name match with fuzzy matching
        if (names.length > 0) {
          const nameStr = typeof names[0] === "string" ? names[0].toLowerCase() : String(names[0]).toLowerCase()
          const firstNameLower = firstName.toLowerCase()
          const lastNameLower = lastName.toLowerCase()

          // Exact match gets highest score
          if (nameStr.includes(firstNameLower) && nameStr.includes(lastNameLower)) {
            confidence += 0.4
            // Bonus for exact order match
            if (nameStr.startsWith(firstNameLower) && nameStr.includes(lastNameLower)) {
              confidence += 0.1
            }
          } else if (nameStr.includes(firstNameLower) || nameStr.includes(lastNameLower)) {
            // Partial match
            confidence += 0.2
          }

          // Check middle name if provided
          if (middleName && nameStr.includes(middleName.toLowerCase())) {
            confidence += 0.1
          }
        }

        // Check location match with better scoring
        let locationMatchScore = 0
        if (city && addresses.some((addr: unknown) => {
          const addrStr = typeof addr === "string" ? addr.toLowerCase() : String(addr).toLowerCase()
          return addrStr.includes(city.toLowerCase())
        })) {
          locationMatchScore += 0.15
        }
        if (state && addresses.some((addr: unknown) => {
          const addrStr = typeof addr === "string" ? addr.toLowerCase() : String(addr).toLowerCase()
          return addrStr.includes(state.toLowerCase())
        })) {
          locationMatchScore += 0.15
        }
        // Bonus if both city and state match
        if (locationMatchScore === 0.3) {
          locationMatchScore += 0.1
        }
        confidence += locationMatchScore

        // Age/DOB matching (body age vs person age)
        if (typeof age === "number" && personAge !== undefined && !Number.isNaN(personAge)) {
          const ageDiff = Math.abs(age - personAge)
          if (ageDiff === 0) {
            confidence += 0.15
          } else if (ageDiff <= 2) {
            confidence += 0.1
          } else if (ageDiff <= 5) {
            confidence += 0.05
          }
        }

        // Bonus for having multiple data points
        const phones = Array.isArray(personObj.phones) ? personObj.phones : []
        const emails = Array.isArray(personObj.emails) ? personObj.emails : []
        const dataPointCount = (names.length > 0 ? 1 : 0) + (addresses.length > 0 ? 1 : 0) + (phones.length > 0 ? 1 : 0) + (emails.length > 0 ? 1 : 0)
        if (dataPointCount >= 3) {
          confidence += 0.1
        }

        // Extract location for display
        const primaryAddress = addresses[0]
        const location = typeof primaryAddress === "string"
          ? primaryAddress
          : (primaryAddress as { city?: string; state?: string })?.city && (primaryAddress as { state?: string })?.state
            ? `${(primaryAddress as { city: string }).city}, ${(primaryAddress as { state: string }).state}`
            : undefined

        return {
          person,
          confidence: Math.min(confidence, 1.0),
          age: personAge,
          location,
        }
      }).sort((a, b) => b.confidence - a.confidence) // Sort by confidence descending
    }

    const responseData = {
      success: true,
      searchType: "name",
      query: { firstName, lastName, city: city || "Any", state: state || "Any" },
      skipTraceData,
      multipleResults: rankedResults.length > 1 ? rankedResults : undefined,
      socialData: { platforms: socialPlatforms, totalFound: socialPlatforms.length },
      possibleEmails: emailVariations,
      searchPerformed: new Date().toISOString(),
    }

    // Cache the result with optimized TTL for name searches
    await cache.set(cacheKey, responseData, cache.getNameTTL()).catch((err) => {
      console.warn("Failed to cache name search result:", err)
    })

    // Log successful search
    const responseTime = Date.now() - startTime
    const resultsCount = countResults(responseData)

    await logSearch({
      userId,
      searchType: "NAME",
      query: { firstName, lastName, city, state },
      resultsCount,
      success: true,
      responseTime,
    }).catch(console.error)

    return NextResponse.json(responseData)
  } catch (error) {
    const responseTime = Date.now() - startTime
    logSearch({
      userId,
      searchType: "NAME",
      query: { firstName: "unknown", lastName: "unknown" },
      resultsCount: 0,
      success: false,
      responseTime,
      error: error instanceof Error ? error.message : "Unknown error",
    }).catch(console.error)

    console.error("Name search error:", error)
    return createErrorResponse(error, "Failed to search by name")
  }
}
