// AI-powered summary generation for search results
// Uses templates and heuristics for now, can be enhanced with LLM integration

import type { PersonData } from "../data-correlation"

export interface SummaryOptions {
  includeInsights?: boolean
  maxLength?: number
}

/**
 * Generate an intelligent summary of person data
 * In Phase 3, this can be enhanced with actual LLM integration (OpenAI, Anthropic, etc.)
 */
export function generateIntelligentSummary(
  data: PersonData,
  options: SummaryOptions = {},
): string {
  const { includeInsights = true, maxLength = 500 } = options

  const parts: string[] = []

  // Extract key information
  const primaryName = data.names?.[0] || "Individual"
  const emailCount = data.emails?.length || 0
  const phoneCount = data.phones?.length || 0
  const addressCount = data.addresses?.length || 0
  const socialCount = Object.keys(data.socialMedia || {}).length

  // Generate summary
  parts.push(`Found information for ${primaryName}.`)

  if (emailCount > 0) {
    parts.push(`${emailCount} email address${emailCount > 1 ? "es" : ""} found.`)
  }

  if (phoneCount > 0) {
    parts.push(`${phoneCount} phone number${phoneCount > 1 ? "s" : ""} associated.`)
  }

  if (addressCount > 0) {
    parts.push(`${addressCount} address${addressCount > 1 ? "es" : ""} on record.`)
  }

  if (socialCount > 0) {
    parts.push(`Active on ${socialCount} social media platform${socialCount > 1 ? "s" : ""}.`)
  }

  if (data.employmentHistory && data.employmentHistory.length > 0) {
    parts.push(`Employment history available (${data.employmentHistory.length} record${data.employmentHistory.length > 1 ? "s" : ""}).`)
  }

  if (data.dataBreaches && data.dataBreaches.length > 0) {
    parts.push(`⚠️ Email found in ${data.dataBreaches.length} data breach${data.dataBreaches.length > 1 ? "es" : ""}.`)
  }

  // Add insights if requested
  if (includeInsights) {
    if (addressCount > 2) {
      parts.push("Multiple addresses suggest recent relocation.")
    }
    if (socialCount >= 5) {
      parts.push("Strong digital presence across multiple platforms.")
    }
    if (emailCount === 0 && phoneCount === 0) {
      parts.push("Limited contact information available.")
    }
  }

  let summary = parts.join(" ")

  // Truncate if needed
  if (summary.length > maxLength) {
    summary = summary.substring(0, maxLength - 3) + "..."
  }

  return summary
}

/**
 * Generate entity resolution confidence score
 * Determines if two person records likely refer to the same individual
 * In Phase 3, this can use ML models for more accurate matching
 */
export function calculateEntityResolutionScore(
  person1: PersonData,
  person2: PersonData,
): number {
  let score = 0
  let maxScore = 0

  // Name matching (40% weight)
  maxScore += 40
  const names1 = (person1.names || []).map(n => typeof n === "string" ? n.toLowerCase() : String(n).toLowerCase())
  const names2 = (person2.names || []).map(n => typeof n === "string" ? n.toLowerCase() : String(n).toLowerCase())
  const nameMatch = names1.some(n1 => names2.some(n2 => {
    // Exact match
    if (n1 === n2) return true
    // Contains match
    if (n1.includes(n2) || n2.includes(n1)) return true
    // Similarity check (simple)
    const longer = n1.length > n2.length ? n1 : n2
    const shorter = n1.length > n2.length ? n2 : n1
    const similarity = 1 - (longer.length - shorter.length) / longer.length
    return similarity > 0.8
  }))
  if (nameMatch) score += 40

  // Email matching (30% weight)
  maxScore += 30
  const emails1 = (person1.emails || []).map(e => e.toLowerCase())
  const emails2 = (person2.emails || []).map(e => e.toLowerCase())
  const emailMatch = emails1.some(e1 => emails2.includes(e1))
  if (emailMatch) score += 30

  // Phone matching (20% weight)
  maxScore += 20
  const phones1 = (person1.phones || []).map(p => p.replace(/\D/g, ""))
  const phones2 = (person2.phones || []).map(p => p.replace(/\D/g, ""))
  const phoneMatch = phones1.some(p1 => phones2.includes(p1))
  if (phoneMatch) score += 20

  // Address matching (10% weight)
  maxScore += 10
  const addresses1 = (person1.addresses || []).map(a => typeof a === "string" ? a.toLowerCase() : String(a).toLowerCase())
  const addresses2 = (person2.addresses || []).map(a => typeof a === "string" ? a.toLowerCase() : String(a).toLowerCase())
  const addressMatch = addresses1.some(a1 => addresses2.some(a2 => {
    if (a1 === a2) return true
    // Check if one contains the other
    return a1.includes(a2) || a2.includes(a1)
  }))
  if (addressMatch) score += 10

  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
}

/**
 * Generate predictive insights
 * Suggests likely attributes or next search steps based on available data
 */
export function generatePredictiveInsights(data: PersonData): string[] {
  const insights: string[] = []

  // If we have name and location but no email
  if (data.names && data.names.length > 0 && data.addresses && data.addresses.length > 0 && (!data.emails || data.emails.length === 0)) {
    insights.push("Try searching with common email patterns based on name and location")
  }

  // If we have multiple addresses
  if (data.addresses && data.addresses.length > 1) {
    insights.push("Multiple addresses detected - person may have relocated recently")
  }

  // If we have limited data
  if ((!data.emails || data.emails.length === 0) && (!data.phones || data.phones.length === 0)) {
    insights.push("Limited contact information - consider searching by alternate identifiers")
  }

  // Social media presence
  const socialCount = Object.keys(data.socialMedia || {}).length
  if (socialCount === 0) {
    insights.push("No social media presence detected - person may use privacy-focused platforms")
  } else if (socialCount >= 5) {
    insights.push("Strong social media presence - person is likely active online")
  }

  return insights
}
