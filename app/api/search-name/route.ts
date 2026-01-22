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

    const skipTraceResponse = await fetch(
      `https://skip-tracing-working-api.p.rapidapi.com/search/byname?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "x-rapidapi-host": "skip-tracing-working-api.p.rapidapi.com",
          "x-rapidapi-key": "9a54072d5cmsh961d1d5cc06d163p169947jsn2a30428d73df",
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
            "x-rapidapi-key": "9a54072d5cmsh961d1d5cc06d163p169947jsn2a30428d73df",
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
          .filter(([key, value]: [string, any]) => value?.registered === true)
          .map(([key, value]: [string, any]) => ({
            platform: key,
            username: value?.username || null,
            url: value?.url || null,
          }))
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
