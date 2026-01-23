import { type NextRequest, NextResponse } from "next/server"

export async function GET(_request: NextRequest) {
  try {
    const apiKey = process.env.RAPIDAPI_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    const [response1, response2, response3] = await Promise.all([
      fetch("https://catch-cheating-boyfriend-hire-adware-recovery-specialist.p.rapidapi.com/", {
        method: "GET",
        headers: {
          "x-rapidapi-host": "catch-cheating-boyfriend-hire-adware-recovery-specialist.p.rapidapi.com",
          "x-rapidapi-key": apiKey,
        },
      }),
      fetch("https://professional-cybernet-surveillance-for-cheating-spouse.p.rapidapi.com/", {
        method: "GET",
        headers: {
          "x-rapidapi-host": "professional-cybernet-surveillance-for-cheating-spouse.p.rapidapi.com",
          "x-rapidapi-key": apiKey,
        },
      }),
      fetch("https://contact-adware-recovery-specialist-to-spy-on-your-cheating.p.rapidapi.com/", {
        method: "GET",
        headers: {
          "x-rapidapi-host": "contact-adware-recovery-specialist-to-spy-on-your-cheating.p.rapidapi.com",
          "x-rapidapi-key": apiKey,
        },
      }),
    ])

    const data1 = response1.ok ? await response1.json() : null
    const data2 = response2.ok ? await response2.json() : null
    const data3 = response3.ok ? await response3.json() : null

    return NextResponse.json({
      success: true,
      data: {
        advancedMonitoring: data1,
        cybernetSurveillance: data2,
        smartphoneSpy: data3,
      },
      disclaimer:
        "This service is for legal and ethical use only with proper consent and authorization. Unauthorized surveillance is illegal.",
    })
  } catch (error) {
    console.error("Relationship monitoring error:", error)
    return NextResponse.json({ error: "An error occurred while fetching monitoring data" }, { status: 500 })
  }
}
