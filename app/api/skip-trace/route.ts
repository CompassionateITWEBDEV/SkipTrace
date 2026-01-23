import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const apiKey = process.env.RAPIDAPI_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    // Call the Skip Tracing API
    const skipTraceResponse = await fetch(
      `https://skip-tracing-working-api.p.rapidapi.com/search/byemail?email=${encodeURIComponent(email)}&phone=1`,
      {
        method: "GET",
        headers: {
          "x-rapidapi-host": "skip-tracing-working-api.p.rapidapi.com",
          "x-rapidapi-key": apiKey,
        },
      },
    )

    if (!skipTraceResponse.ok) {
      const errorText = await skipTraceResponse.text()
      throw new Error(`Skip trace API failed: ${errorText}`)
    }

    const skipTraceData = await skipTraceResponse.json()

    // Also call the social media checker for additional info
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

    let socialData = null
    if (socialResponse.ok) {
      socialData = await socialResponse.json()
    }

    return NextResponse.json({
      skipTrace: skipTraceData,
      socialMedia: socialData,
      email: email,
      searchedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Skip trace failed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to perform skip trace" },
      { status: 500 },
    )
  }
}
