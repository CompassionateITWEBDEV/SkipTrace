import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { phoneNumber } = await request.json()

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
    }

    let formattedPhone = phoneNumber.trim()

    // Remove any spaces, dashes, parentheses, or dots
    formattedPhone = formattedPhone.replace(/[\s\-().]/g, "")

    // Must start with + and have digits
    if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+" + formattedPhone
    }

    // Validate format: must be + followed by 10-15 digits
    const digitsOnly = formattedPhone.substring(1)
    if (!/^\d{10,15}$/.test(digitsOnly)) {
      return NextResponse.json(
        {
          error: "Invalid phone format. Must be in international format: +[country code][number] (10-15 digits total)",
        },
        { status: 400 },
      )
    }

    // Call the Virtual Phone Numbers Detector API
    const response = await fetch("https://virtual-phone-numbers-detector.p.rapidapi.com/check-number", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-host": "virtual-phone-numbers-detector.p.rapidapi.com",
        "x-rapidapi-key": "9a54072d5cmsh961d1d5cc06d163p169947jsn2a30428d73df",
      },
      body: JSON.stringify({ phone: formattedPhone }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText }
      }

      const errorMessage = errorData.message || "Failed to validate phone number"
      const hint = errorMessage.includes("international format")
        ? " Please ensure the number includes country code (e.g., +1 for US, +44 for UK)"
        : ""

      return NextResponse.json({ error: errorMessage + hint }, { status: response.status })
    }

    const apiData = await response.json()

    // Transform API response to match our component's expected format
    const result = {
      phoneNumber,
      isValid: apiData.valid !== false,
      isVirtual: apiData.is_virtual || apiData.disposable || false,
      isDisposable: apiData.disposable || apiData.is_virtual || false,
      riskScore: apiData.risk_score || (apiData.is_virtual ? 85 : 15),
      carrier: apiData.carrier || apiData.operator || "Unknown",
      lineType: apiData.line_type || apiData.type || (apiData.is_virtual ? "VOIP" : "Mobile"),
      country: apiData.country || apiData.country_code || "Unknown",
      warnings:
        apiData.is_virtual || apiData.disposable
          ? [
              "Number detected in virtual phone database",
              "High risk of fraud",
              "Commonly used for OTP bypass",
              "Updated multiple times daily",
            ]
          : [],
      lastSeen: apiData.last_seen || (apiData.is_virtual ? new Date().toISOString() : null),
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Phone validation error:", error)
    return NextResponse.json({ error: "Failed to validate phone number" }, { status: 500 })
  }
}
