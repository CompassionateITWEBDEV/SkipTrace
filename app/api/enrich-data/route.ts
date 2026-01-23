import { type NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    const { email, phone, name, address } = await request.json()

    const apiKey = process.env.RAPIDAPI_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    // Run multiple enrichment APIs in parallel
    const enrichmentPromises: Promise<ApiResponse | null>[] = []

    // Email enrichment
    if (email) {
      enrichmentPromises.push(
        fetch(`https://skip-tracing-working-api.p.rapidapi.com/search/byemail?email=${encodeURIComponent(email)}&phone=1`, {
          headers: {
            "x-rapidapi-host": "skip-tracing-working-api.p.rapidapi.com",
            "x-rapidapi-key": apiKey,
          },
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      )

      enrichmentPromises.push(
        fetch(`https://email-social-media-checker.p.rapidapi.com/check_email?email=${encodeURIComponent(email)}`, {
          headers: {
            "x-rapidapi-host": "email-social-media-checker.p.rapidapi.com",
            "x-rapidapi-key": apiKey,
          },
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      )
    }

    // Phone enrichment
    if (phone) {
      const cleanedPhone = phone.replace(/\D/g, "")
      const formattedPhone = cleanedPhone.startsWith("+") ? cleanedPhone : `+${cleanedPhone}`

      enrichmentPromises.push(
        fetch("https://virtual-phone-numbers-detector.p.rapidapi.com/check-number", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-rapidapi-host": "virtual-phone-numbers-detector.p.rapidapi.com",
            "x-rapidapi-key": apiKey,
          },
          body: JSON.stringify({ phone: formattedPhone }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      )
    }

    // Name enrichment
    if (name) {
      const [firstName, ...lastNameParts] = name.split(" ")
      const lastName = lastNameParts.join(" ")

      if (firstName && lastName) {
        const params = new URLSearchParams({
          firstName,
          lastName,
        })

        enrichmentPromises.push(
          fetch(`https://skip-tracing-working-api.p.rapidapi.com/search/byname?${params.toString()}`, {
            headers: {
              "x-rapidapi-host": "skip-tracing-working-api.p.rapidapi.com",
              "x-rapidapi-key": apiKey,
            },
          })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        )
      }
    }

    const results = await Promise.all(enrichmentPromises)

    // Correlate and merge data
    const enrichedData = {
      inputData: { email, phone, name, address },
      skipTraceData: results[0],
      socialMediaData: results[1],
      phoneValidation: results[2],
      nameSearchData: results[3],
      confidenceScore: calculateConfidenceScore(results),
      dataPoints: countDataPoints(results),
      enrichedAt: new Date().toISOString(),
    }

    return NextResponse.json(enrichedData)
  } catch (error) {
    console.error("Data enrichment failed:", error)
    return NextResponse.json({ error: "Failed to enrich data" }, { status: 500 })
  }
}

function calculateConfidenceScore(results: (ApiResponse | null)[]): number {
  let score = 0
  let total = 0

  results.forEach((result) => {
    if (result) {
      total++
      if (result.success || (result as { found?: boolean }).found || result.data) {
        score++
      }
    }
  })

  return total > 0 ? Math.round((score / total) * 100) : 0
}

function countDataPoints(results: (ApiResponse | null)[]): number {
  let count = 0

  results.forEach((result) => {
    if (result) {
      if (Array.isArray(result)) {
        count += result.length
      } else if (typeof result === "object") {
        count += Object.keys(result).length
      }
    }
  })

  return count
}
