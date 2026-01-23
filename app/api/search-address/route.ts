import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { street, city, state, zip } = await request.json()

    if (!street) {
      return NextResponse.json({ error: "Street address is required" }, { status: 400 })
    }

    const fullAddress = `${street}${city ? `, ${city}` : ""}${state ? `, ${state}` : ""}${zip ? ` ${zip}` : ""}`

    const params = new URLSearchParams({
      street: street,
      phone: "1",
    })
    if (city) params.append("city", city)
    if (state) params.append("state", state)
    if (zip) params.append("zip", zip)

    const apiKey = process.env.RAPIDAPI_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    let skipTraceData = null
    try {
      const skipTraceResponse = await fetch(
        `https://skip-tracing-working-api.p.rapidapi.com/search/byaddress?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "x-rapidapi-host": "skip-tracing-working-api.p.rapidapi.com",
            "x-rapidapi-key": apiKey,
          },
        },
      )

      if (skipTraceResponse.ok) {
        skipTraceData = await skipTraceResponse.json()
      }
    } catch (e) {
      console.error("Skip trace by address failed:", e)
    }

    return NextResponse.json({
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
      propertyInfo: {
        address: fullAddress,
        type: "Residential",
        county: state || "N/A",
      },
      instructions: skipTraceData
        ? null
        : "To find residents at this address, search by their name or email in the other tabs.",
      searchPerformed: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Address search error:", error)
    return NextResponse.json({ error: "Failed to search by address" }, { status: 500 })
  }
}
