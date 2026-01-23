// AI-powered report summarization
// Uses natural language generation to create human-readable summaries

import type { PersonData } from "../data-correlation"

export interface ReportSummary {
  summary: string
  keyFindings: string[]
  confidence: number
  recommendations: string[]
}

/**
 * Generate a natural language summary of search results
 */
export function generateReportSummary(data: PersonData, confidenceScore: number): ReportSummary {
  const keyFindings: string[] = []
  const recommendations: string[] = []

  // Build key findings
  if (data.names && data.names.length > 0) {
    const primaryName = data.names[0]
    keyFindings.push(`Primary identity: ${primaryName}`)
    if (data.names.length > 1) {
      keyFindings.push(`Found ${data.names.length} name variations`)
    }
  }

  if (data.emails && data.emails.length > 0) {
    keyFindings.push(`Found ${data.emails.length} email address${data.emails.length > 1 ? "es" : ""}`)
    if (data.emails.length > 1) {
      recommendations.push("Multiple emails suggest work/personal separation - verify both")
    }
  }

  if (data.phones && data.phones.length > 0) {
    keyFindings.push(`Found ${data.phones.length} phone number${data.phones.length > 1 ? "s" : ""}`)
  }

  if (data.addresses && data.addresses.length > 0) {
    keyFindings.push(`Found ${data.addresses.length} address${data.addresses.length > 1 ? "es" : ""} in records`)
    if (data.addresses.length > 1) {
      recommendations.push("Multiple addresses detected - person may have relocated recently")
    }
  }

  const socialCount = data.socialMedia ? Object.keys(data.socialMedia).length : 0
  if (socialCount > 0) {
    keyFindings.push(`Active on ${socialCount} social media platform${socialCount > 1 ? "s" : ""}`)
    if (socialCount >= 5) {
      recommendations.push("Strong social media presence - consider cross-referencing profiles")
    }
  }

  if (data.employmentHistory && data.employmentHistory.length > 0) {
    keyFindings.push(`Employment history available (${data.employmentHistory.length} record${data.employmentHistory.length > 1 ? "s" : ""})`)
  }

  if (data.dataBreaches && data.dataBreaches.length > 0) {
    keyFindings.push(`⚠️ Email found in ${data.dataBreaches.length} data breach${data.dataBreaches.length > 1 ? "es" : ""}`)
    recommendations.push("Data breach detected - recommend password change and security review")
  }

  // Generate summary paragraph
  let summary = ""
  if (confidenceScore >= 80) {
    summary = "High confidence match found. "
  } else if (confidenceScore >= 50) {
    summary = "Moderate confidence match found. "
  } else {
    summary = "Low confidence match - verify information. "
  }

  const dataPoints: string[] = []
  if (data.names && data.names.length > 0) dataPoints.push("name")
  if (data.emails && data.emails.length > 0) dataPoints.push("email")
  if (data.phones && data.phones.length > 0) dataPoints.push("phone")
  if (data.addresses && data.addresses.length > 0) dataPoints.push("address")

  if (dataPoints.length > 0) {
    summary += `Found ${dataPoints.join(", ")} information. `
  }

  if (data.names && data.names.length > 0 && data.emails && data.emails.length > 0 && data.phones && data.phones.length > 0) {
    summary += "Complete contact profile available with name, email, and phone verification. "
  }

  if (socialCount > 0) {
    summary += `Digital footprint includes ${socialCount} social media platform${socialCount > 1 ? "s" : ""}. `
  }

  if (data.addresses && data.addresses.length > 1) {
    summary += "Multiple addresses suggest recent relocation or address history. "
  }

  // Add recommendations based on data quality
  if (confidenceScore < 50) {
    recommendations.push("Low confidence score - verify information with additional sources")
  }

  if (!data.emails || data.emails.length === 0) {
    recommendations.push("No email found - try searching with phone or name to locate email")
  }

  if (!data.phones || data.phones.length === 0) {
    recommendations.push("No phone number found - consider reverse lookup if address is known")
  }

  if (data.addresses && data.addresses.length === 0) {
    recommendations.push("No address found - try searching property records or public records")
  }

  return {
    summary: summary.trim(),
    keyFindings,
    confidence: confidenceScore,
    recommendations: recommendations.length > 0 ? recommendations : ["No specific recommendations"],
  }
}

/**
 * Generate a detailed narrative summary for comprehensive searches
 */
export function generateDetailedSummary(data: PersonData, confidenceScore: number): string {
  const summary = generateReportSummary(data, confidenceScore)
  
  let narrative = summary.summary + "\n\n"
  
  if (summary.keyFindings.length > 0) {
    narrative += "Key Findings:\n"
    summary.keyFindings.forEach((finding, idx) => {
      narrative += `${idx + 1}. ${finding}\n`
    })
    narrative += "\n"
  }

  if (summary.recommendations.length > 0 && summary.recommendations[0] !== "No specific recommendations") {
    narrative += "Recommendations:\n"
    summary.recommendations.forEach((rec, idx) => {
      narrative += `${idx + 1}. ${rec}\n`
    })
  }

  return narrative.trim()
}
