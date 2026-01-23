import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { address, city, state, zip } = await request.json()

    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 })
    }

    const apiKey = process.env.RAPIDAPI_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    const fullAddress = `${address}, ${city || ""}, ${state || ""} ${zip || ""}`.trim()

    // Try address validation API
    const response = await fetch("https://address-validation2.p.rapidapi.com/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-host": "address-validation2.p.rapidapi.com",
        "x-rapidapi-key": apiKey,
      },
      body: JSON.stringify({ address: fullAddress }),
    })

    if (!response.ok) {
      // Fallback to basic validation
      return NextResponse.json({
        address: fullAddress,
        isValid: address.length > 5,
        confidence: "low",
        type: "basic-validation",
        components: { address, city, state, zip },
        validatedAt: new Date().toISOString(),
      })
    }

    const data = await response.json()
    return NextResponse.json({
      ...data,
      validatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Address validation failed:", error)
    return NextResponse.json({ error: "Failed to validate address" }, { status: 500 })
  }
}
