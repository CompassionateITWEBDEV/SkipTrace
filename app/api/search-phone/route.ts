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

    // Call skip tracing API by phone
    const [skipTraceResponse, virtualCheckResponse] = await Promise.all([
      fetch(
        `https://skip-tracing-working-api.p.rapidapi.com/search/byphone?phone=${encodeURIComponent(cleanedPhone)}`,
        {
          method: "GET",
          headers: {
            "x-rapidapi-host": "skip-tracing-working-api.p.rapidapi.com",
            "x-rapidapi-key": "9a54072d5cmsh961d1d5cc06d163p169947jsn2a30428d73df",
          },
        },
      ),
      fetch("https://virtual-phone-numbers-detector.p.rapidapi.com/check-number", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-host": "virtual-phone-numbers-detector.p.rapidapi.com",
          "x-rapidapi-key": "9a54072d5cmsh961d1d5cc06d163p169947jsn2a30428d73df",
        },
        body: JSON.stringify({ phone: cleanedPhone }),
      }),
    ])

    let skipTraceData = null
    let virtualCheckData = null

    if (skipTraceResponse.ok) {
      skipTraceData = await skipTraceResponse.json()
    } else {
      const errorText = await skipTraceResponse.text()
      console.error("Skip trace phone API error:", errorText)
    }

    if (virtualCheckResponse.ok) {
      virtualCheckData = await virtualCheckResponse.json()
    }

    return NextResponse.json({
      success: true,
      searchType: "phone",
      query: { phone: cleanedPhone },
      skipTraceData,
      virtualCheck: virtualCheckData,
      searchPerformed: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Phone search error:", error)
    return NextResponse.json({ error: "Failed to search by phone" }, { status: 500 })
  }
}
