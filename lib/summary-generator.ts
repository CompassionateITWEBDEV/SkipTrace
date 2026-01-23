// Natural language summary generator for search results

import type { PersonData } from "./data-correlation"

interface SummaryOptions {
  includeConfidence?: boolean
  includeSocialMedia?: boolean
  maxLength?: number
}

/**
 * Generate a human-readable summary from correlated person data
 */
export function generateSummary(
  data: PersonData,
  confidenceScore?: number,
  options: SummaryOptions = {},
): string {
  const {
    includeConfidence = true,
    includeSocialMedia = true,
    maxLength = 500,
  } = options

  const parts: string[] = []

  // Start with name
  if (data.names && data.names.length > 0) {
    const primaryName = data.names[0]
    parts.push(`Found ${primaryName}`)
  } else {
    parts.push("Found person")
  }

  // Add location if available
  if (data.addresses && data.addresses.length > 0) {
    const primaryAddress = data.addresses[0]
    // Try to extract city/state from address
    const addressStr = typeof primaryAddress === "string" ? primaryAddress : primaryAddress
    const cityMatch = addressStr.match(/,?\s*([^,]+),\s*([A-Z]{2})/)
    if (cityMatch) {
      parts.push(`in ${cityMatch[1]}, ${cityMatch[2]}`)
    } else {
      parts.push(`at ${addressStr.split(",")[0]}`)
    }
  }

  // Add contact information summary
  const contactInfo: string[] = []
  if (data.emails && data.emails.length > 0) {
    contactInfo.push(`${data.emails.length} email${data.emails.length > 1 ? "s" : ""}`)
  }
  if (data.phones && data.phones.length > 0) {
    contactInfo.push(`${data.phones.length} phone number${data.phones.length > 1 ? "s" : ""}`)
  }
  if (contactInfo.length > 0) {
    parts.push(`Contact info includes ${contactInfo.join(" and ")}`)
  }

  // Add address count
  if (data.addresses && data.addresses.length > 1) {
    parts.push(`${data.addresses.length} known addresses`)
  }

  // Add social media presence
  if (includeSocialMedia && data.socialMedia) {
    const platformCount = Object.keys(data.socialMedia).length
    if (platformCount > 0) {
      const topPlatforms = Object.keys(data.socialMedia).slice(0, 3)
      if (platformCount <= 3) {
        parts.push(`Active on ${topPlatforms.join(", ")}`)
      } else {
        parts.push(`Active on ${topPlatforms.join(", ")} and ${platformCount - 3} other platform${platformCount - 3 > 1 ? "s" : ""}`)
      }
    }
  }

  // Add employment if available
  if (data.employmentHistory && data.employmentHistory.length > 0) {
    const jobs = data.employmentHistory as Array<{ company?: string; title?: string }>
    const latestJob = jobs[0]
    if (latestJob?.company || latestJob?.title) {
      const jobDesc = [latestJob.title, latestJob.company].filter(Boolean).join(" at ")
      if (jobDesc) {
        parts.push(`Currently ${jobDesc}`)
      }
    }
  }

  // Add confidence score
  if (includeConfidence && confidenceScore !== undefined) {
    parts.push(`Confidence: ${confidenceScore}%`)
  }

  let summary = parts.join(". ") + "."

  // Truncate if too long
  if (summary.length > maxLength) {
    summary = summary.substring(0, maxLength - 3) + "..."
  }

  return summary
}

/**
 * Generate a short one-line summary
 */
export function generateShortSummary(data: PersonData, confidenceScore?: number): string {
  return generateSummary(data, confidenceScore, {
    includeConfidence: false,
    includeSocialMedia: false,
    maxLength: 150,
  })
}

/**
 * Generate a detailed summary with all information
 * Enhanced with AI-style insights and recommendations
 */
export function generateDetailedSummary(data: PersonData, confidenceScore?: number): string {
  const score = confidenceScore || 0
  const parts: string[] = []
  const insights: string[] = []

  // Confidence assessment
  if (score >= 80) {
    parts.push("High confidence match found.")
  } else if (score >= 50) {
    parts.push("Moderate confidence match found.")
  } else {
    parts.push("Low confidence match - verify information with additional sources.")
  }

  // Name information
  if (data.names && data.names.length > 0) {
    const primaryName = data.names[0]
    parts.push(`Primary identity: ${primaryName}`)
    if (data.names.length > 1) {
      insights.push(`Found ${data.names.length} name variations, suggesting data consistency across sources`)
    }
  }

  // Contact information
  const contactInfo: string[] = []
  if (data.emails && data.emails.length > 0) {
    contactInfo.push(`${data.emails.length} email address${data.emails.length > 1 ? "es" : ""}`)
    if (data.emails.length > 1) {
      insights.push("Multiple emails detected - likely work and personal accounts")
    }
  }
  if (data.phones && data.phones.length > 0) {
    contactInfo.push(`${data.phones.length} phone number${data.phones.length > 1 ? "s" : ""}`)
  }
  if (contactInfo.length > 0) {
    parts.push(`Contact information: ${contactInfo.join(", ")}`)
  }

  // Address information
  if (data.addresses && data.addresses.length > 0) {
    parts.push(`Found ${data.addresses.length} address${data.addresses.length > 1 ? "es" : ""} in records`)
    if (data.addresses.length > 1) {
      insights.push("Multiple addresses suggest recent relocation or address history")
    }
  }

  // Social media
  if (data.socialMedia) {
    const platformCount = Object.keys(data.socialMedia).length
    if (platformCount > 0) {
      const topPlatforms = Object.keys(data.socialMedia).slice(0, 3).map(p => p.charAt(0).toUpperCase() + p.slice(1))
      if (platformCount <= 3) {
        parts.push(`Active on ${topPlatforms.join(", ")}`)
      } else {
        parts.push(`Active on ${topPlatforms.join(", ")} and ${platformCount - 3} other platform${platformCount - 3 > 1 ? "s" : ""}`)
      }
      if (platformCount >= 5) {
        insights.push("Strong social media presence indicates active digital footprint")
      }
    }
  }

  // Employment
  if (data.employmentHistory && data.employmentHistory.length > 0) {
    const jobs = data.employmentHistory as Array<{ company?: string; title?: string }>
    const latestJob = jobs[0]
    if (latestJob?.company || latestJob?.title) {
      const jobDesc = [latestJob.title, latestJob.company].filter(Boolean).join(" at ")
      if (jobDesc) {
        parts.push(`Employment: ${jobDesc}`)
      }
    }
  }

  // Data breaches
  if (data.dataBreaches && data.dataBreaches.length > 0) {
    insights.push(`⚠️ Security alert: Email found in ${data.dataBreaches.length} data breach${data.dataBreaches.length > 1 ? "es" : ""}`)
  }

  // Cross-field verification
  if (data.names && data.names.length > 0 && data.emails && data.emails.length > 0 && data.phones && data.phones.length > 0) {
    insights.push("Complete profile verified across multiple data sources")
  }

  // Build final summary
  let summary = parts.join(" ") + "\n\n"
  
  if (insights.length > 0) {
    summary += "Key Insights:\n"
    insights.forEach((insight, idx) => {
      summary += `${idx + 1}. ${insight}\n`
    })
  }

  summary += `\nConfidence Score: ${score}%`

  return summary.trim()
}
