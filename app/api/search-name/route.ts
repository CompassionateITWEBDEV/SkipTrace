import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { firstName, lastName, city, state } = await request.json()

    if (!firstName || !lastName) {
      return NextResponse.json({ error: "First name and last name are required" }, { status: 400 })
    }

    const params = new URLSearchParams({
      first_name: firstName,
      last_name: lastName,
      phone: "1", // Include phone numbers in results
    })

    if (city) params.append("city", city)
    if (state) params.append("state", state)

    const apiKey = process.env.RAPIDAPI_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    const skipTraceResponse = await fetch(
      `https://skip-tracing-working-api.p.rapidapi.com/search/byname?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "x-rapidapi-host": "skip-tracing-working-api.p.rapidapi.com",
          "x-rapidapi-key": apiKey,
        },
      },
    )

    let skipTraceData = null
    if (skipTraceResponse.ok) {
      skipTraceData = await skipTraceResponse.json()
    } else {
      const errorText = await skipTraceResponse.text()
      console.error("Skip trace API error:", errorText)
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

    return NextResponse.json({
      success: true,
      searchType: "name",
      query: { firstName, lastName, city: city || "Any", state: state || "Any" },
      skipTraceData,
      socialData: { platforms: socialPlatforms, totalFound: socialPlatforms.length },
      possibleEmails: emailVariations,
      searchPerformed: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Name search error:", error)
    return NextResponse.json({ error: "Failed to search by name" }, { status: 500 })
  }
}
