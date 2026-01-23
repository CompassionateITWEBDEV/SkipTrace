import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { phone } = await request.json()

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
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

    const apiKey = process.env.RAPIDAPI_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    // Call virtual phone detector (main validation)
    let virtualCheckData = null
    let skipTraceData = null
    let apiWarning = null

    try {
      const virtualCheckResponse = await fetch("https://virtual-phone-numbers-detector.p.rapidapi.com/check-number", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-host": "virtual-phone-numbers-detector.p.rapidapi.com",
          "x-rapidapi-key": apiKey,
        },
        body: JSON.stringify({ phone: cleanedPhone }),
      })

      if (virtualCheckResponse.ok) {
        virtualCheckData = await virtualCheckResponse.json()
      }
    } catch (error) {
      console.error("Virtual phone check error:", error)
    }

    // Try skip trace API (optional - may not be subscribed)
    try {
      const skipTraceResponse = await fetch(
        `https://skip-tracing-working-api.p.rapidapi.com/search/byphone?phone=${encodeURIComponent(cleanedPhone)}`,
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
      } else if (skipTraceResponse.status === 403) {
        apiWarning = "Phone skip tracing requires additional API subscription. Showing virtual phone detection results."
      }
    } catch (error) {
      console.error("Skip trace phone API error:", error)
    }

    return NextResponse.json({
      success: true,
      searchType: "phone",
      query: { phone: cleanedPhone },
      skipTraceData,
      virtualCheck: virtualCheckData,
      warning: apiWarning,
      searchPerformed: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Phone search error:", error)
    return NextResponse.json({ error: "Failed to search by phone" }, { status: 500 })
  }
}
