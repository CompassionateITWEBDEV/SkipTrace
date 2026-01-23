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
  summary?: string
  insights?: string[]
}

/**
 * Enhanced data correlation engine
 * Merges data from multiple sources, deduplicates, and calculates confidence scores
 */
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

    // Handle nested person data structure (from skip-trace API)
    const personData = (sourceObj.person || (sourceObj.data as Record<string, unknown>)?.person || sourceObj) as Record<string, unknown>

    // Extract names - check multiple possible locations
    const namesSource = (personData.names || personData.name || sourceObj.names || sourceObj.name || sourceObj.fullName) as unknown
    if (namesSource) {
      const names = Array.isArray(namesSource) ? namesSource : [namesSource]
      names.forEach((name: unknown) => {
        let nameStr: string | undefined
        if (typeof name === "string") {
          nameStr = name.trim()
        } else if (name && typeof name === "object") {
          const nameObj = name as { display?: string; full?: string; first?: string; last?: string }
          nameStr = nameObj.display || nameObj.full || (nameObj.first && nameObj.last ? `${nameObj.first} ${nameObj.last}` : undefined)
          if (nameStr) nameStr = nameStr.trim()
        }
        if (nameStr && nameStr.length > 0) {
          // Normalize name for better deduplication
          const normalized = normalizeName(nameStr)
          
          // Check if this name is similar to an existing one (handle variations)
          let isDuplicate = false
          for (const existingName of fieldCounts.names) {
            if (areNamesSimilar(normalized, existingName)) {
              isDuplicate = true
              // Keep the longer/more complete version
              if (normalized.length > existingName.length) {
                fieldCounts.names.delete(existingName)
                fieldCounts.names.add(normalized)
              }
              break
            }
          }
          
          if (!isDuplicate) {
            fieldCounts.names.add(normalized)
          }
        }
      })
    }

    // Extract emails - check multiple possible locations
    const emailsSource = (personData.emails || personData.email || sourceObj.emails || sourceObj.email) as unknown
    if (emailsSource) {
      const emails = Array.isArray(emailsSource) ? emailsSource : [emailsSource]
      emails.forEach((email: unknown) => {
        let emailStr: string | undefined
        if (typeof email === "string") {
          emailStr = email.trim().toLowerCase()
        } else if (email && typeof email === "object") {
          emailStr = ((email as { address?: string; email?: string }).address || (email as { email?: string }).email)?.toLowerCase().trim()
        }
        if (emailStr && emailStr.includes("@")) {
          fieldCounts.emails.add(emailStr)
        }
      })
    }

    // Extract phones - check multiple possible locations
    const phonesSource = (personData.phones || personData.phone || sourceObj.phones || sourceObj.phone) as unknown
    if (phonesSource) {
      const phones = Array.isArray(phonesSource) ? phonesSource : [phonesSource]
      phones.forEach((phone: unknown) => {
        let phoneStr: string | undefined
        if (typeof phone === "string") {
          phoneStr = phone
        } else if (phone && typeof phone === "object") {
          phoneStr = (phone as { number?: string; display?: string }).number || (phone as { display?: string }).display
        }
        if (phoneStr) {
          // Normalize phone number (remove all non-digits, keep leading +)
          let normalized = phoneStr.startsWith("+") 
            ? "+" + phoneStr.replace(/\D/g, "")
            : phoneStr.replace(/\D/g, "")
          
          // Handle US numbers: +1XXXXXXXXXX -> +1XXXXXXXXXX or XXXXXXXXXX -> +1XXXXXXXXXX
          if (normalized.length === 10 && !normalized.startsWith("+")) {
            normalized = "+1" + normalized
          } else if (normalized.length === 11 && normalized.startsWith("1") && !normalized.startsWith("+")) {
            normalized = "+" + normalized
          }
          
          if (normalized.length >= 10) {
            // Check for duplicates (same number in different formats)
            let isDuplicate = false
            for (const existingPhone of fieldCounts.phones) {
              // Normalize both for comparison
              const existingNormalized = existingPhone.startsWith("+") 
                ? existingPhone 
                : existingPhone.length === 10 
                ? "+1" + existingPhone 
                : "+" + existingPhone
              
              if (normalized === existingNormalized || 
                  (normalized.replace(/^\+1/, "") === existingNormalized.replace(/^\+1/, "") && normalized.length === existingNormalized.length)) {
                isDuplicate = true
                break
              }
            }
            
            if (!isDuplicate) {
              fieldCounts.phones.add(normalized)
            }
          }
        }
      })
    }

    // Extract addresses - check multiple possible locations
    const addressesSource = (personData.addresses || personData.address || sourceObj.addresses || sourceObj.address) as unknown
    if (addressesSource) {
      const addresses = Array.isArray(addressesSource) ? addressesSource : [addressesSource]
      addresses.forEach((addr: unknown) => {
        let addrStr: string | undefined
        if (typeof addr === "string") {
          addrStr = addr.trim()
        } else if (addr && typeof addr === "object") {
          const addrObj = addr as { display?: string; full?: string; street?: string; city?: string; state?: string; zip?: string }
          addrStr = addrObj.display || addrObj.full
          if (!addrStr && (addrObj.street || addrObj.city)) {
            addrStr = [
              addrObj.street,
              addrObj.city,
              addrObj.state,
              addrObj.zip
            ].filter(Boolean).join(", ")
          }
        }
        if (addrStr && addrStr.length > 5) {
          // Normalize address for better deduplication
          const normalized = normalizeAddress(addrStr)
          
          // Check for similar addresses (fuzzy matching)
          let isDuplicate = false
          for (const existingAddr of fieldCounts.addresses) {
            if (isSimilar(normalized, existingAddr, 0.85)) {
              isDuplicate = true
              // Keep the more complete version
              if (normalized.length > existingAddr.length) {
                fieldCounts.addresses.delete(existingAddr)
                fieldCounts.addresses.add(normalized)
              }
              break
            }
          }
          
          if (!isDuplicate) {
            fieldCounts.addresses.add(normalized)
          }
        }
      })
    }

    // Merge social media - check multiple possible locations
    const socialMediaSource = (personData.socialMedia || personData.social_profiles || personData.socialProfiles || sourceObj.socialMedia || sourceObj.social_profiles) as Record<string, unknown> | undefined
    if (socialMediaSource && typeof socialMediaSource === "object" && socialMediaSource !== null && correlatedData.socialMedia) {
      Object.assign(correlatedData.socialMedia, socialMediaSource)
    }

    // Merge employment history - check multiple possible locations
    const jobsSource = (personData.jobs || personData.employmentHistory || personData.employment || sourceObj.jobs || sourceObj.employmentHistory) as unknown
    if (Array.isArray(jobsSource)) {
      correlatedData.employmentHistory?.push(...(jobsSource as unknown[]))
    }

    // Merge data breaches - check multiple possible locations
    const breachesSource = (personData.dataBreaches || personData.breaches || sourceObj.dataBreaches || sourceObj.breaches) as unknown
    if (Array.isArray(breachesSource)) {
      correlatedData.dataBreaches?.push(...(breachesSource as unknown[]))
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

  // Generate natural language summary
  const summary = generateSummary(correlatedData, confidenceScore, matchingFields, conflicts)

  // Generate insights
  const insights = generateInsights(correlatedData, matchingFields, conflicts)

  return {
    correlatedData,
    confidenceScore,
    dataQuality,
    matchingFields,
    conflicts,
    summary,
    insights,
  }
}

function calculateConfidenceScore(data: PersonData, sourceCount: number): number {
  let score = 0
  let maxScore = 0

  // Name verification (25 points) - increased weight
  maxScore += 25
  if (data.names && data.names.length > 0) {
    // Base score for having a name
    score += 15
    // Bonus for multiple name variations (indicates data consistency)
    if (data.names.length > 1) {
      score += Math.min((data.names.length - 1) * 3, 10)
    }
  }

  // Email verification (25 points) - increased weight
  maxScore += 25
  if (data.emails && data.emails.length > 0) {
    score += 15
    // Bonus for multiple emails (work/personal)
    if (data.emails.length > 1) {
      score += Math.min((data.emails.length - 1) * 3, 10)
    }
  }

  // Phone verification (20 points)
  maxScore += 20
  if (data.phones && data.phones.length > 0) {
    score += 12
    // Bonus for multiple phone numbers
    if (data.phones.length > 1) {
      score += Math.min((data.phones.length - 1) * 2, 8)
    }
  }

  // Address verification (15 points)
  maxScore += 15
  if (data.addresses && data.addresses.length > 0) {
    score += 10
    // Bonus for address history (shows data depth)
    if (data.addresses.length > 1) {
      score += Math.min((data.addresses.length - 1) * 1.5, 5)
    }
  }

  // Social media presence (10 points)
  maxScore += 10
  if (data.socialMedia && Object.keys(data.socialMedia).length > 0) {
    const socialCount = Object.keys(data.socialMedia).length
    score += 5 + Math.min(socialCount * 0.5, 5)
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

  // Multiple source bonus (up to 15 points) - increased weight
  maxScore += 15
  if (sourceCount > 1) {
    // More sources = higher confidence
    score += Math.min(sourceCount * 3, 15)
  }

  // Cross-field verification bonus (if we have name + email + phone, that's very strong)
  if (data.names && data.names.length > 0 && 
      data.emails && data.emails.length > 0 && 
      data.phones && data.phones.length > 0) {
    score += 10
    maxScore += 10
  }

  return Math.min(Math.round((score / maxScore) * 100), 100)
}

function getMatchingFields(data: PersonData): string[] {
  const matching: string[] = []

  if (data.names && data.names.length > 1) matching.push("name")
  if (data.emails && data.emails.length > 1) matching.push("email")
  if (data.phones && data.phones.length > 1) matching.push("phone")
  if (data.addresses && data.addresses.length > 1) matching.push("address")

  return matching
}

/**
 * Common name variations and nicknames mapping
 */
const nameVariations: Record<string, string[]> = {
  "william": ["bill", "billy", "will", "willy"],
  "robert": ["bob", "bobby", "rob", "robby"],
  "richard": ["rick", "ricky", "dick", "rich"],
  "james": ["jim", "jimmy", "jamie"],
  "john": ["jack", "johnny", "jon"],
  "joseph": ["joe", "joey"],
  "michael": ["mike", "mikey", "mick"],
  "thomas": ["tom", "tommy"],
  "christopher": ["chris", "chris"],
  "daniel": ["dan", "danny"],
  "matthew": ["matt", "matty"],
  "anthony": ["tony", "ant"],
  "andrew": ["andy", "drew"],
  "joshua": ["josh"],
  "nicholas": ["nick", "nick"],
  "elizabeth": ["liz", "lizzie", "beth", "betty"],
  "jennifer": ["jen", "jenny"],
  "patricia": ["pat", "patty", "trish"],
  "margaret": ["maggie", "marge", "peg", "peggy"],
  "susan": ["sue", "suzie"],
  "dorothy": ["dot", "dottie"],
  "nancy": ["nan"],
  "karen": ["kar"],
  "lisa": ["liz"],
}

/**
 * Normalize name for better matching (remove extra spaces, handle variations)
 * Also expands common nicknames to their full forms for better matching
 */
function normalizeName(name: string): string {
  const normalized = name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\./g, "") // Remove periods
    .replace(/,/g, "") // Remove commas
    .replace(/'/g, "") // Remove apostrophes

  // Split into parts and check for nicknames
  const parts = normalized.split(" ")
  const normalizedParts = parts.map((part) => {
    // Check if this part is a nickname and replace with canonical form
    for (const [canonical, variations] of Object.entries(nameVariations)) {
      if (variations.includes(part)) {
        return canonical
      }
    }
    return part
  })

  return normalizedParts.join(" ")
}

/**
 * Check if two names are likely the same person (handles variations)
 */
export function areNamesSimilar(name1: string, name2: string): boolean {
  const n1 = normalizeName(name1)
  const n2 = normalizeName(name2)

  // Exact match after normalization
  if (n1 === n2) return true

  // Check if normalized forms share significant parts
  const parts1 = n1.split(" ")
  const parts2 = n2.split(" ")

  // If both have last names, they must match
  if (parts1.length > 1 && parts2.length > 1) {
    const last1 = parts1[parts1.length - 1]
    const last2 = parts2[parts2.length - 1]
    if (last1 !== last2) return false

    // First names should be similar (handles nicknames)
    const first1 = parts1[0]
    const first2 = parts2[0]
    if (isSimilar(first1, first2, 0.7)) return true

    // Check if one is a variation of the other
    for (const [canonical, variations] of Object.entries(nameVariations)) {
      if ((first1 === canonical && variations.includes(first2)) ||
          (first2 === canonical && variations.includes(first1))) {
        return true
      }
    }
  }

  // Fallback to similarity check
  return isSimilar(n1, n2, 0.85)
}

/**
 * Normalize address for better matching
 */
function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\./g, "") // Remove periods
    .replace(/#/g, "") // Remove # symbols
    .replace(/\b(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct)\b/gi, "") // Remove common address suffixes
    .trim()
}

/**
 * Check if two strings are similar (fuzzy match)
 */
function isSimilar(str1: string, str2: string, threshold = 0.8): boolean {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()
  
  if (s1 === s2) return true
  
  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) return true
  
  // Simple Levenshtein-like similarity check
  const longer = s1.length > s2.length ? s1 : s2
  const editDistance = levenshteinDistance(s1, s2)
  const similarity = 1 - editDistance / longer.length
  
  return similarity >= threshold
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

function detectConflicts(fieldCounts: Record<string, Set<string>>): string[] {
  const conflicts: string[] = []

  Object.entries(fieldCounts).forEach(([field, values]) => {
    if (values.size > 3) {
      conflicts.push(`Multiple conflicting ${field} found (${values.size} variations)`)
    } else if (values.size > 1 && field === "names") {
      // For names, check if they're actually different people
      const nameArray = Array.from(values)
      const uniqueNames = new Set<string>()
      nameArray.forEach(name => {
        let isDuplicate = false
        uniqueNames.forEach(existingName => {
          if (isSimilar(name, existingName, 0.85)) {
            isDuplicate = true
          }
        })
        if (!isDuplicate) {
          uniqueNames.add(name)
        }
      })
      if (uniqueNames.size < nameArray.length) {
        conflicts.push(`Name variations detected - may be the same person with different name formats`)
      }
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

/**
 * Generate a natural language summary of the correlated data
 */
function generateSummary(
  data: PersonData,
  confidenceScore: number,
  matchingFields: string[],
  conflicts: string[],
): string {
  const parts: string[] = []

  // Start with confidence level
  if (confidenceScore >= 80) {
    parts.push("High confidence match")
  } else if (confidenceScore >= 50) {
    parts.push("Moderate confidence match")
  } else {
    parts.push("Low confidence match - verify information")
  }

  // Add data points found
  const dataPoints: string[] = []
  if (data.names && data.names.length > 0) {
    dataPoints.push(`${data.names.length} name${data.names.length > 1 ? "s" : ""}`)
  }
  if (data.emails && data.emails.length > 0) {
    dataPoints.push(`${data.emails.length} email${data.emails.length > 1 ? "s" : ""}`)
  }
  if (data.phones && data.phones.length > 0) {
    dataPoints.push(`${data.phones.length} phone number${data.phones.length > 1 ? "s" : ""}`)
  }
  if (data.addresses && data.addresses.length > 0) {
    dataPoints.push(`${data.addresses.length} address${data.addresses.length > 1 ? "es" : ""}`)
  }

  if (dataPoints.length > 0) {
    parts.push(`Found ${dataPoints.join(", ")}`)
  }

  // Add social media info
  const socialCount = Object.keys(data.socialMedia || {}).length
  if (socialCount > 0) {
    parts.push(`Active on ${socialCount} social media platform${socialCount > 1 ? "s" : ""}`)
  }

  // Add conflicts if any
  if (conflicts.length > 0) {
    parts.push(`Note: ${conflicts.length} potential data conflict${conflicts.length > 1 ? "s" : ""} detected`)
  }

  return parts.join(". ") + "."
}

/**
 * Generate insights about the data
 */
function generateInsights(
  data: PersonData,
  matchingFields: string[],
  conflicts: string[],
): string[] {
  const insights: string[] = []

  // Data completeness insights
  const hasName = data.names && data.names.length > 0
  const hasEmail = data.emails && data.emails.length > 0
  const hasPhone = data.phones && data.phones.length > 0
  const hasAddress = data.addresses && data.addresses.length > 0

  if (hasName && hasEmail && hasPhone && hasAddress) {
    insights.push("Complete profile with name, email, phone, and address information")
  } else if (hasName && (hasEmail || hasPhone)) {
    insights.push("Partial profile - consider additional searches to complete information")
  }

  // Multiple sources insight
  if (matchingFields.length > 0) {
    insights.push(`Data verified across multiple sources for: ${matchingFields.join(", ")}`)
  }

  // Address history insight
  if (data.addresses && data.addresses.length > 1) {
    insights.push(`Address history shows ${data.addresses.length} locations - may indicate recent relocation`)
  }

  // Social media insight
  const socialCount = Object.keys(data.socialMedia || {}).length
  if (socialCount >= 5) {
    insights.push("Strong social media presence across multiple platforms")
  } else if (socialCount > 0) {
    insights.push("Limited social media footprint")
  }

  // Employment insight
  if (data.employmentHistory && data.employmentHistory.length > 0) {
    insights.push(`Employment history available (${data.employmentHistory.length} record${data.employmentHistory.length > 1 ? "s" : ""})`)
  }

  // Conflict warnings
  if (conflicts.length > 0) {
    insights.push("⚠️ Data conflicts detected - verify information from multiple sources")
  }

  return insights
}
