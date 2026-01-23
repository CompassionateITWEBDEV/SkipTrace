import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 })
    }

    const apiKey = process.env.RAPIDAPI_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    // Search for username across platforms
    const response = await fetch(
      `https://username-search.p.rapidapi.com/search?username=${encodeURIComponent(username)}`,
      {
        method: "GET",
        headers: {
          "x-rapidapi-host": "username-search.p.rapidapi.com",
          "x-rapidapi-key": apiKey,
        },
      },
    )

    if (!response.ok) {
      // Fallback to email social media checker with common domains
      const emailVariations = [
        `${username}@gmail.com`,
        `${username}@yahoo.com`,
        `${username}@outlook.com`,
      ]

      const socialChecks = await Promise.all(
        emailVariations.map(async (email) => {
          const socialResponse = await fetch(
            `https://email-social-media-checker.p.rapidapi.com/check_email?email=${encodeURIComponent(email)}`,
            {
              method: "GET",
              headers: {
                "x-rapidapi-host": "email-social-media-checker.p.rapidapi.com",
                "x-rapidapi-key": apiKey,
              },
            },
          )
          if (socialResponse.ok) {
            return { email, data: await socialResponse.json() }
          }
          return null
        }),
      )

      return NextResponse.json({
        username,
        source: "email-based-inference",
        results: socialChecks.filter(Boolean),
        searchedAt: new Date().toISOString(),
      })
    }

    const data = await response.json()
    return NextResponse.json({
      ...data,
      username,
      searchedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Username search failed:", error)
    return NextResponse.json({ error: "Failed to search username" }, { status: 500 })
  }
}
