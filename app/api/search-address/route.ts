import { NextResponse } from "next/server"
import { cache } from "@/lib/cache"
import { createErrorResponse, ValidationError, ExternalApiError } from "@/lib/error-handler"
import { getCurrentUser } from "@/lib/auth"
import { logSearch, countResults } from "@/lib/search-logger"
import { searchByAddress, buildCityStateZip } from "@/lib/skip-trace-client"

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
    const { street, city, state, zip } = body

    if (!street || typeof street !== "string" || street.trim().length === 0) {
      throw new ValidationError("Street address is required", "street")
    }

    const fullAddress = `${street}${city ? `, ${city}` : ""}${state ? `, ${state}` : ""}${zip ? ` ${zip}` : ""}`

    // Check cache first
    const cacheKey = cache.getAddressKey(street, city, state, zip)
    const cachedResult = await cache.get<{
      success: boolean
      searchType: string
      query: unknown
      skipTraceData: unknown
      residents?: unknown[]
      propertyInfo: unknown
      instructions?: string | null
      searchPerformed: string
    }>(cacheKey)

    if (cachedResult) {
      return NextResponse.json(cachedResult)
    }

    const citystatezip = buildCityStateZip(city, state, zip)

    const apiKey = process.env.RAPIDAPI_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    let skipTraceData = null
    const residents: Array<{
      name?: string
      phone?: string
      email?: string
      age?: number | string
    }> = []

    try {
      skipTraceData = await searchByAddress(street.trim(), citystatezip || street.trim(), "1")
    } catch (err) {
      throw new ExternalApiError(
        `Address search API request failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        undefined,
        err,
      )
    }

    if (skipTraceData) {
      // Prefer PeopleDetails (official API shape), then fallback to legacy shapes
      const peopleArray = Array.isArray(skipTraceData.PeopleDetails)
        ? skipTraceData.PeopleDetails
        : skipTraceData.person || (skipTraceData.data as Record<string, unknown>)?.person || skipTraceData
      const peopleList = Array.isArray(peopleArray) ? peopleArray : [peopleArray]

      peopleList.forEach((person: unknown) => {
        if (!person || typeof person !== "object") return

        const personObj = person as Record<string, unknown>

        // PeopleDetails shape: Name, Person ID, Age, Lives in, Link, Related to
        const officialName = personObj.Name ?? personObj.name
        if (typeof officialName === "string" && officialName.trim()) {
          const ageVal = personObj.Age ?? personObj.age ?? personObj.ages
          const age = typeof ageVal === "number" ? ageVal : typeof ageVal === "string" ? parseInt(ageVal, 10) : undefined
          const isDuplicate = residents.some((r) => r.name?.toLowerCase() === officialName.trim().toLowerCase())
          if (!isDuplicate) {
            residents.push({
              name: officialName.trim(),
              ...(age !== undefined && !Number.isNaN(age) && { age }),
            })
          }
          return
        }

        // Legacy: extract names - handle multiple formats
        const names = personObj.names || personObj.name || []
        const namesArray = Array.isArray(names) ? names : names ? [names] : []

        // Extract phones
        const phones = personObj.phones || personObj.phone || []
        const phonesArray = Array.isArray(phones) ? phones : phones ? [phones] : []

        // Extract emails
        const emails = personObj.emails || personObj.email || []
        const emailsArray = Array.isArray(emails) ? emails : emails ? [emails] : []

        // Extract age
        const ageData = personObj.age || personObj.ages
        const age = typeof ageData === "number" ? ageData : typeof ageData === "string" ? parseInt(ageData, 10) : undefined

        // If we have names, create resident entries for each name
        if (namesArray.length > 0) {
          namesArray.forEach((nameEntry: string | { display?: string; full?: string; first?: string; last?: string }, nameIndex: number) => {
                const nameStr =
                  typeof nameEntry === "string"
                    ? nameEntry.trim()
                    : nameEntry.display || nameEntry.full || `${nameEntry.first || ""} ${nameEntry.last || ""}`.trim()

                if (nameStr && nameStr.length > 0) {
                  // Try to match phone and email by index, or use first available
                  const phone = nameIndex < phonesArray.length
                    ? (typeof phonesArray[nameIndex] === "string"
                        ? phonesArray[nameIndex]
                        : (phonesArray[nameIndex] as { number?: string; display?: string }).number || (phonesArray[nameIndex] as { display?: string }).display)
                    : phonesArray[0]
                      ? (typeof phonesArray[0] === "string"
                          ? phonesArray[0]
                          : (phonesArray[0] as { number?: string; display?: string }).number || (phonesArray[0] as { display?: string }).display)
                      : undefined

                  const email = nameIndex < emailsArray.length
                    ? (typeof emailsArray[nameIndex] === "string"
                        ? emailsArray[nameIndex]
                        : (emailsArray[nameIndex] as { address?: string; email?: string }).address || (emailsArray[nameIndex] as { email?: string }).email)
                    : emailsArray[0]
                      ? (typeof emailsArray[0] === "string"
                          ? emailsArray[0]
                          : (emailsArray[0] as { address?: string; email?: string }).address || (emailsArray[0] as { email?: string }).email)
                      : undefined

                  // Check if we already have this resident (avoid duplicates)
                  const isDuplicate = residents.some(
                    (r) => r.name?.toLowerCase() === nameStr.toLowerCase() && 
                           (!phone || r.phone === phone) && 
                           (!email || r.email === email)
                  )

                  if (!isDuplicate) {
                    const resident: { name?: string; phone?: string; email?: string; age?: number | string } = {
                      name: nameStr,
                      ...(phone && { phone }),
                      ...(email && { email }),
                    }
                    if (age) resident.age = age
                    residents.push(resident)
                  }
              }
            })
        } else if (phonesArray.length > 0 || emailsArray.length > 0) {
              // If no names but we have contact info, create a generic entry
              const phone = phonesArray[0]
                ? (typeof phonesArray[0] === "string"
                    ? phonesArray[0]
                    : (phonesArray[0] as { number?: string; display?: string }).number || (phonesArray[0] as { display?: string }).display)
                : undefined

              const email = emailsArray[0]
                ? (typeof emailsArray[0] === "string"
                    ? emailsArray[0]
                    : (emailsArray[0] as { address?: string; email?: string }).address || (emailsArray[0] as { email?: string }).email)
                : undefined

              // Only add if we don't already have a resident with this contact info
              const hasContactInfo = residents.some(
                (r) => (phone && r.phone === phone) || (email && r.email === email)
              )

              if (!hasContactInfo) {
                const resident: { name?: string; phone?: string; email?: string; age?: number | string } = {}
                if (phone) resident.phone = phone
                if (email) resident.email = email
                if (age) resident.age = age
              residents.push(resident)
            }
          }
        })
    }

    // Try to fetch property records from property API if available
    const propertyRecordsData = null
    if (process.env.PROPERTY_API_KEY || process.env.ATTOM_API_KEY) {
      try {
        // Try ATTOM Data API or similar property records service
        // Format: Use Google Places API or ATTOM Data API for property information
        const propertyApiKey = process.env.ATTOM_API_KEY || process.env.PROPERTY_API_KEY
        
        // For now, we'll use a placeholder - in production, integrate with actual property API
        // Example: ATTOM Data API requires specific authentication and endpoint structure
        if (propertyApiKey && zip) {
          // Property API integration would go here
          // For now, we'll enhance with skip trace data only
        }
      } catch (error) {
        console.warn("Property records API error:", error)
        // Continue without property records data
      }
    }

    // Determine property type from data if available
    let propertyType = "Residential"
    let propertyValue: string | number | undefined
    let propertyOwner: string | undefined
    let lastSaleDate: string | undefined
    let county: string | undefined
    let propertyYearBuilt: string | number | undefined
    let propertySquareFeet: string | number | undefined
    let propertyBedrooms: number | undefined
    let propertyBathrooms: number | undefined

    // Merge property records data if available
    if (propertyRecordsData) {
      const propData = propertyRecordsData as Record<string, unknown>
      if (propData.propertyType) propertyType = String(propData.propertyType)
      if (propData.assessedValue || propData.marketValue) {
        propertyValue = typeof propData.assessedValue === "number" 
          ? propData.assessedValue 
          : typeof propData.marketValue === "number"
          ? propData.marketValue
          : undefined
      }
      if (propData.owner) propertyOwner = String(propData.owner)
      if (propData.lastSaleDate) lastSaleDate = String(propData.lastSaleDate)
      if (propData.county) county = String(propData.county)
      if (propData.yearBuilt) {
        propertyYearBuilt = typeof propData.yearBuilt === "number" 
          ? propData.yearBuilt 
          : typeof propData.yearBuilt === "string"
          ? parseInt(propData.yearBuilt) || propData.yearBuilt
          : undefined
      }
      if (propData.squareFeet || propData.sqft) {
        propertySquareFeet = typeof propData.squareFeet === "number" 
          ? propData.squareFeet 
          : typeof propData.sqft === "number"
          ? propData.sqft
          : undefined
      }
      if (propData.bedrooms) propertyBedrooms = typeof propData.bedrooms === "number" ? propData.bedrooms : parseInt(String(propData.bedrooms))
      if (propData.bathrooms) propertyBathrooms = typeof propData.bathrooms === "number" ? propData.bathrooms : parseFloat(String(propData.bathrooms))
    }

    if (skipTraceData) {
      // Try to extract property information from various possible API response formats
      const propertyData = (skipTraceData.property ?? skipTraceData.propertyInfo ?? skipTraceData) as Record<string, unknown>

      // Property type
      if (propertyData?.type || propertyData?.propertyType || propertyData?.property_type) {
        propertyType = String(propertyData.type || propertyData.propertyType || propertyData.property_type)
      }

      // Property value - check multiple formats
      if (propertyData?.value || propertyData?.estimatedValue || propertyData?.assessedValue || 
          propertyData?.estimated_value || propertyData?.assessed_value || propertyData?.marketValue || propertyData?.market_value) {
        const value = propertyData.value || propertyData.estimatedValue || propertyData.assessedValue || 
                     propertyData.estimated_value || propertyData.assessed_value || propertyData.marketValue || propertyData.market_value
        propertyValue = typeof value === "number" ? value : typeof value === "string" ? parseFloat(value.replace(/[^0-9.]/g, "")) : undefined
      }

      // Enhanced owner extraction - check multiple possible locations
      if (propertyData?.owner || propertyData?.ownerName || propertyData?.owner_name) {
        const owner = propertyData.owner || propertyData.ownerName || propertyData.owner_name
        propertyOwner = typeof owner === "string"
          ? owner.trim()
          : (owner as { name?: string; fullName?: string; full_name?: string })?.name || 
            (owner as { fullName?: string; full_name?: string })?.fullName || 
            (owner as { full_name?: string })?.full_name || 
            String(owner)
      }

      // Also check if owner info is in person data (first person might be owner)
      const personData = skipTraceData.PeopleDetails ?? skipTraceData.person ?? (skipTraceData.data as Record<string, unknown>)?.person
      if (!propertyOwner && personData) {
        const peopleArray = Array.isArray(personData) ? personData : [personData]
        if (peopleArray.length > 0) {
          const firstPerson = peopleArray[0] as Record<string, unknown>
          const officialName = firstPerson.Name ?? firstPerson.name
          if (typeof officialName === "string" && officialName.trim()) {
            propertyOwner = officialName.trim()
          }
          const names = firstPerson.names || firstPerson.name || (typeof officialName === "string" ? [officialName] : [])
          const namesArray = Array.isArray(names) ? names : names ? [names] : []
          if (namesArray.length > 0) {
            const firstName = namesArray[0]
            propertyOwner = typeof firstName === "string"
              ? firstName.trim()
              : (firstName as { display?: string; full?: string; first?: string; last?: string })?.display || 
                (firstName as { full?: string; first?: string; last?: string })?.full ||
                `${(firstName as { first?: string; last?: string })?.first || ""} ${(firstName as { first?: string; last?: string })?.last || ""}`.trim()
          }
        }
      }

      // Sale date
      if (propertyData?.lastSaleDate || propertyData?.saleDate || propertyData?.last_sale_date || 
          propertyData?.lastSale || propertyData?.last_sale) {
        lastSaleDate = String(propertyData.lastSaleDate || propertyData.saleDate || propertyData.last_sale_date || 
                             propertyData.lastSale || propertyData.last_sale)
      }

      // County information
      if (propertyData?.county) {
        county = String(propertyData.county)
      } else if (skipTraceData.county) {
        county = String(skipTraceData.county)
      } else if (state) {
        // Use state as fallback for county display
        county = state
      }

      // Additional property details
      if (propertyData?.yearBuilt ?? propertyData?.year_built) {
        const yb = propertyData.yearBuilt ?? propertyData.year_built
        propertyYearBuilt = typeof yb === "number" ? yb : typeof yb === "string" ? yb : undefined
      }
      if (propertyData?.squareFeet || propertyData?.square_feet || propertyData?.sqft || propertyData?.sqFt) {
        const sqft = propertyData.squareFeet || propertyData.square_feet || propertyData.sqft || propertyData.sqFt
        propertySquareFeet = typeof sqft === "number" ? sqft : typeof sqft === "string" ? parseFloat(sqft) : undefined
      }
      if (propertyData?.bedrooms || propertyData?.beds) {
        const beds = propertyData.bedrooms || propertyData.beds
        propertyBedrooms = typeof beds === "number" ? beds : typeof beds === "string" ? parseInt(beds) : undefined
      }
      if (propertyData?.bathrooms || propertyData?.baths) {
        const baths = propertyData.bathrooms || propertyData.baths
        propertyBathrooms = typeof baths === "number" ? baths : typeof baths === "string" ? parseFloat(baths) : undefined
      }
    }

    const responseData = {
      success: true,
      searchType: "address",
      query: {
        street,
        city: city || "N/A",
        state: state || "N/A",
        zip: zip || "N/A",
        fullAddress,
      },
      skipTraceData,
      residents: residents.length > 0 ? residents : undefined,
      propertyInfo: {
        address: fullAddress,
        type: propertyType,
        county: county || state || "N/A",
        ...(propertyValue && { estimatedValue: propertyValue }),
        ...(propertyOwner && { owner: propertyOwner }),
        ...(lastSaleDate && { lastSaleDate }),
        ...(propertyYearBuilt && { yearBuilt: propertyYearBuilt }),
        ...(propertySquareFeet && { squareFeet: propertySquareFeet }),
        ...(propertyBedrooms && { bedrooms: propertyBedrooms }),
        ...(propertyBathrooms && { bathrooms: propertyBathrooms }),
      },
      instructions:
        residents.length > 0
          ? null
          : skipTraceData
            ? "Resident information could not be extracted from the response. Try searching by name or email for more details."
            : "No data found for this address. To find residents, search by their name or email in the other tabs.",
      searchPerformed: new Date().toISOString(),
    }

    // Cache the result with optimized TTL for address searches
    await cache.set(cacheKey, responseData, cache.getAddressTTL()).catch((err) => {
      console.warn("Failed to cache address search result:", err)
    })

    // Log successful search
    const responseTime = Date.now() - startTime
    const resultsCount = countResults(responseData)

    await logSearch({
      userId,
      searchType: "ADDRESS",
      query: { street, city, state, zip },
      resultsCount,
      success: true,
      responseTime,
    }).catch(console.error)

    return NextResponse.json(responseData)
  } catch (error) {
    const responseTime = Date.now() - startTime
    logSearch({
      userId,
      searchType: "ADDRESS",
      query: { street: "unknown" },
      resultsCount: 0,
      success: false,
      responseTime,
      error: error instanceof Error ? error.message : "Unknown error",
    }).catch(console.error)

    console.error("Address search error:", error)
    return createErrorResponse(error, "Failed to search by address")
  }
}
