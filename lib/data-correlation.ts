// Data correlation and confidence scoring utilities

export interface PersonData {
  names?: string[]
  emails?: string[]
  phones?: string[]
  addresses?: string[]
  socialMedia?: Record<string, unknown>
  employmentHistory?: unknown[]
  dataBreaches?: unknown[]
}

export interface CorrelationResult {
  correlatedData: PersonData
  confidenceScore: number
  dataQuality: "high" | "medium" | "low"
  matchingFields: string[]
  conflicts: string[]
}

export function correlatePersonData(sources: unknown[]): CorrelationResult {
  const correlatedData: PersonData = {
    names: [],
    emails: [],
    phones: [],
    addresses: [],
    socialMedia: {},
    employmentHistory: [],
    dataBreaches: [],
  }

  const fieldCounts: Record<string, Set<string>> = {
    names: new Set(),
    emails: new Set(),
    phones: new Set(),
    addresses: new Set(),
  }

  // Extract and deduplicate data from all sources
  sources.forEach((source) => {
    if (!source) return

    const sourceObj = source as Record<string, unknown>

    // Extract names
    if (sourceObj.names || sourceObj.name || sourceObj.fullName) {
      const names = Array.isArray(sourceObj.names) ? sourceObj.names : [sourceObj.name || sourceObj.fullName]
      names.forEach((name: unknown) => {
        const nameStr = typeof name === "string" ? name : (name as { display?: string; full?: string })?.display || (name as { full?: string })?.full
        if (nameStr) fieldCounts.names.add(nameStr.toLowerCase())
      })
    }

    // Extract emails
    if (sourceObj.emails || sourceObj.email) {
      const emails = Array.isArray(sourceObj.emails) ? sourceObj.emails : [sourceObj.email]
      emails.forEach((email: unknown) => {
        const emailStr = typeof email === "string" ? email : (email as { address?: string })?.address
        if (emailStr) fieldCounts.emails.add(emailStr.toLowerCase())
      })
    }

    // Extract phones
    if (sourceObj.phones || sourceObj.phone) {
      const phones = Array.isArray(sourceObj.phones) ? sourceObj.phones : [sourceObj.phone]
      phones.forEach((phone: unknown) => {
        const phoneStr = typeof phone === "string" ? phone : (phone as { number?: string })?.number
        if (phoneStr) fieldCounts.phones.add(phoneStr.replace(/\D/g, ""))
      })
    }

    // Extract addresses
    if (sourceObj.addresses || sourceObj.address) {
      const addresses = Array.isArray(sourceObj.addresses) ? sourceObj.addresses : [sourceObj.address]
      addresses.forEach((addr: unknown) => {
        const addrStr = typeof addr === "string" ? addr : (addr as { display?: string; full?: string })?.display || (addr as { full?: string })?.full
        if (addrStr) fieldCounts.addresses.add(addrStr.toLowerCase())
      })
    }

    // Merge social media
    if (sourceObj.socialMedia && correlatedData.socialMedia && typeof sourceObj.socialMedia === "object" && sourceObj.socialMedia !== null) {
      Object.assign(correlatedData.socialMedia, sourceObj.socialMedia)
    }

    // Merge employment history
    if (Array.isArray(sourceObj.employmentHistory)) {
      correlatedData.employmentHistory?.push(...sourceObj.employmentHistory)
    }

    // Merge data breaches
    if (Array.isArray(sourceObj.dataBreaches)) {
      correlatedData.dataBreaches?.push(...sourceObj.dataBreaches)
    }
  })

  // Convert sets to arrays
  correlatedData.names = Array.from(fieldCounts.names)
  correlatedData.emails = Array.from(fieldCounts.emails)
  correlatedData.phones = Array.from(fieldCounts.phones)
  correlatedData.addresses = Array.from(fieldCounts.addresses)

  // Calculate confidence score
  const confidenceScore = calculateConfidenceScore(correlatedData, sources.length)

  // Determine data quality
  const dataQuality = confidenceScore > 70 ? "high" : confidenceScore > 40 ? "medium" : "low"

  // Find matching fields across sources
  const matchingFields = getMatchingFields(correlatedData)

  // Detect conflicts (same field, different values)
  const conflicts = detectConflicts(fieldCounts)

  return {
    correlatedData,
    confidenceScore,
    dataQuality,
    matchingFields,
    conflicts,
  }
}

function calculateConfidenceScore(data: PersonData, sourceCount: number): number {
  let score = 0
  let maxScore = 0

  // Name verification (20 points)
  maxScore += 20
  if (data.names && data.names.length > 0) {
    score += 10 + Math.min(data.names.length * 5, 10)
  }

  // Email verification (20 points)
  maxScore += 20
  if (data.emails && data.emails.length > 0) {
    score += 10 + Math.min(data.emails.length * 5, 10)
  }

  // Phone verification (20 points)
  maxScore += 20
  if (data.phones && data.phones.length > 0) {
    score += 10 + Math.min(data.phones.length * 5, 10)
  }

  // Address verification (15 points)
  maxScore += 15
  if (data.addresses && data.addresses.length > 0) {
    score += 10 + Math.min(data.addresses.length * 2, 5)
  }

  // Social media presence (15 points)
  maxScore += 15
  if (data.socialMedia && Object.keys(data.socialMedia).length > 0) {
    score += 10 + Math.min(Object.keys(data.socialMedia).length, 5)
  }

  // Employment history (5 points)
  maxScore += 5
  if (data.employmentHistory && data.employmentHistory.length > 0) {
    score += 5
  }

  // Data breach information (5 points)
  maxScore += 5
  if (data.dataBreaches && data.dataBreaches.length > 0) {
    score += 5
  }

  // Multiple source bonus (up to 10 points)
  maxScore += 10
  if (sourceCount > 1) {
    score += Math.min(sourceCount * 2, 10)
  }

  return Math.round((score / maxScore) * 100)
}

function getMatchingFields(data: PersonData): string[] {
  const matching: string[] = []

  if (data.names && data.names.length > 1) matching.push("name")
  if (data.emails && data.emails.length > 1) matching.push("email")
  if (data.phones && data.phones.length > 1) matching.push("phone")
  if (data.addresses && data.addresses.length > 1) matching.push("address")

  return matching
}

function detectConflicts(fieldCounts: Record<string, Set<string>>): string[] {
  const conflicts: string[] = []

  Object.entries(fieldCounts).forEach(([field, values]) => {
    if (values.size > 3) {
      conflicts.push(`Multiple conflicting ${field} found (${values.size} variations)`)
    }
  })

  return conflicts
}

export function generateSearchSuggestions(data: PersonData): string[] {
  const suggestions: string[] = []

  if (data.emails && data.emails.length === 0 && data.names && data.names.length > 0) {
    suggestions.push("Try searching with common email domains (@gmail.com, @yahoo.com)")
  }

  if (data.phones && data.phones.length === 0) {
    suggestions.push("Consider running a phone reverse lookup if you have a number")
  }

  if (data.addresses && data.addresses.length > 2) {
    suggestions.push("Multiple addresses found - person may have relocated recently")
  }

  if (Object.keys(data.socialMedia || {}).length < 3) {
    suggestions.push("Limited social media presence - try username search")
  }

  return suggestions
}
