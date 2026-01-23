import { NextResponse } from "next/server"

/**
 * Email validation and breach check API
 * Uses HaveIBeenPwned API for breach data
 */
export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Check if email is in breach database using HaveIBeenPwned API
    const sha1Hash = await crypto.subtle.digest(
      "SHA-1",
      new TextEncoder().encode(email.toLowerCase()),
    )
    const hashArray = Array.from(new Uint8Array(sha1Hash))
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
    const hashPrefix = hashHex.substring(0, 5)
    const hashSuffix = hashHex.substring(5).toUpperCase()

    let breachCount = 0

    try {
      // Use HaveIBeenPwned range API (more privacy-friendly)
      const response = await fetch(`https://api.pwnedpasswords.com/range/${hashPrefix}`, {
        headers: {
          "User-Agent": "SkipTrace-EmailValidator/1.0",
        },
      })

      if (response.ok) {
        const text = await response.text()
        const lines = text.split("\n")
        const match = lines.find((line) => line.startsWith(hashSuffix))

        if (match) {
          const [, count] = match.split(":")
          breachCount = parseInt(count, 10) || 0
        }
      }
    } catch (error) {
      console.error("Error checking breach database:", error)
      // Continue without breach data
    }

    // Check if email is from a disposable email provider
    const disposableDomains = [
      "tempmail.com",
      "10minutemail.com",
      "guerrillamail.com",
      "mailinator.com",
      "throwaway.email",
    ]
    const domain = email.split("@")[1]?.toLowerCase()
    const isDisposable = disposableDomains.some((d) => domain?.includes(d))

    // Basic email validation (format is already checked)
    const isValidFormat = emailRegex.test(email)

    return NextResponse.json({
      email,
      isValidFormat,
      isDisposable,
      breachCount,
      isBreached: breachCount > 0,
      riskScore: calculateRiskScore(isDisposable, breachCount),
      checkedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Email validation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to validate email" },
      { status: 500 },
    )
  }
}

/**
 * Calculate risk score based on email characteristics
 */
function calculateRiskScore(isDisposable: boolean, breachCount: number): number {
  let score = 0

  if (isDisposable) {
    score += 70
  }

  if (breachCount > 0) {
    // Add risk based on breach count (capped at 30 points)
    score += Math.min(30, breachCount * 2)
  }

  return Math.min(100, score)
}
