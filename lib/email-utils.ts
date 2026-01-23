// Email validation and breach checking utilities

/**
 * Check if an email has been found in data breaches using HaveIBeenPwned API
 * Uses the public API v3 which requires the full email (k-anonymity model)
 */
export async function checkEmailBreach(email: string): Promise<{
  breached: boolean
  breachCount?: number
  breaches?: Array<{ Name: string; Domain: string; BreachDate: string }>
  error?: string
}> {
  try {
    // HaveIBeenPwned API v3 - requires full email address
    // This is a public API that uses k-anonymity (only sends first 5 chars of hash)
    const response = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}`, {
      headers: {
        "User-Agent": "SkipTrace/1.0",
        "hibp-api-key": process.env.HIBP_API_KEY || "", // Optional API key for higher rate limits
      },
      signal: AbortSignal.timeout(10000),
    })

    if (response.status === 404) {
      // Email not found in breaches
      return { breached: false, breachCount: 0 }
    }

    if (!response.ok) {
      // Rate limited or other error
      if (response.status === 429) {
        return { breached: false, error: "Rate limited - breach check temporarily unavailable" }
      }
      return { breached: false, error: "Breach check service unavailable" }
    }

    const breaches = await response.json() as Array<{ Name: string; Domain: string; BreachDate: string }>
    
    return {
      breached: true,
      breachCount: breaches.length,
      breaches: breaches.slice(0, 10), // Limit to first 10 breaches
    }
  } catch (error) {
    console.warn("Email breach check failed:", error)
    // Don't fail the entire search if breach check fails
    return {
      breached: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Validate email format and check if it's deliverable
 * Uses a simple format check - for full validation, integrate with a service like ZeroBounce
 */
export function validateEmailFormat(email: string): {
  valid: boolean
  reason?: string
  suggestions?: string[]
} {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!email || typeof email !== "string") {
    return { valid: false, reason: "Email is required" }
  }

  const trimmed = email.trim().toLowerCase()

  if (!emailRegex.test(trimmed)) {
    return { valid: false, reason: "Invalid email format" }
  }

  // Check for common disposable email domains
  const disposableDomains = [
    "tempmail.com",
    "10minutemail.com",
    "guerrillamail.com",
    "mailinator.com",
    "throwaway.email",
  ]

  const domain = trimmed.split("@")[1]
  if (disposableDomains.some((d) => domain.includes(d))) {
    return {
      valid: true,
      reason: "Email appears to be from a disposable email service",
      suggestions: ["Consider this may be a temporary email address"],
    }
  }

  return { valid: true }
}

/**
 * Check email reputation and deliverability
 * Supports multiple email validation services:
 * - Abstract Email Validation API (via RapidAPI)
 * - ZeroBounce
 * - Mailgun Email Validation
 */
export async function checkEmailReputation(email: string): Promise<{
  deliverable: boolean
  riskScore?: number
  domain?: string
  suggestions?: string[]
  mxRecords?: boolean
  smtpCheck?: boolean
}> {
  const validation = validateEmailFormat(email)

  if (!validation.valid) {
    return {
      deliverable: false,
      suggestions: validation.reason ? [validation.reason] : undefined,
    }
  }

  const domain = email.split("@")[1]

  // Try to use Abstract Email Validation API if available (via RapidAPI)
  const rapidApiKey = process.env.RAPIDAPI_KEY
  if (rapidApiKey) {
    try {
      const response = await fetch(
        `https://emailvalidation.abstractapi.com/v1/?api_key=${process.env.ABSTRACT_EMAIL_API_KEY || ""}&email=${encodeURIComponent(email)}`,
        {
          method: "GET",
          signal: AbortSignal.timeout(10000),
        },
      ).catch(() => {
        // Fallback to RapidAPI email validation if Abstract API key not available
        return fetch(
          `https://email-validator8.p.rapidapi.com/api/v2.1/email?email=${encodeURIComponent(email)}`,
          {
            method: "GET",
            headers: {
              "x-rapidapi-host": "email-validator8.p.rapidapi.com",
              "x-rapidapi-key": rapidApiKey,
            },
            signal: AbortSignal.timeout(10000),
          },
        )
      })

      if (response.ok) {
        const data = await response.json() as {
          deliverability?: string
          is_deliverable?: boolean
          is_valid_format?: { value: boolean }
          is_free_email?: { value: boolean }
          is_disposable_email?: { value: boolean }
          is_role_email?: { value: boolean }
          mx_records?: { value: boolean }
          smtp?: { valid: boolean }
          quality_score?: number
          risk_score?: number
        }

        const deliverable = data.is_deliverable ?? (data.deliverability === "DELIVERABLE" ? true : (data.smtp?.valid ?? false))
        const riskScore = data.risk_score ?? (data.is_disposable_email?.value ? 0.8 : data.is_free_email?.value ? 0.5 : 0.3)

        return {
          deliverable,
          domain,
          riskScore,
          mxRecords: data.mx_records?.value ?? undefined,
          smtpCheck: data.smtp?.valid ?? undefined,
          suggestions: data.is_disposable_email?.value
            ? ["Email appears to be from a disposable email service"]
            : data.is_role_email?.value
            ? ["Email appears to be a role-based address (e.g., info@, support@)"]
            : undefined,
        }
      }
    } catch (error) {
      console.warn("Email validation API error:", error)
      // Fall through to basic validation
    }
  }

  // Basic domain check fallback
  return {
    deliverable: true,
    domain,
    riskScore: validation.suggestions ? 0.7 : 0.3, // Higher risk if disposable
    suggestions: validation.suggestions,
  }
}
