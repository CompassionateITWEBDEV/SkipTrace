// AI-powered entity resolution for matching records across sources
// Uses fuzzy matching and confidence scoring to determine if records refer to the same person

import type { PersonData } from "../data-correlation"
import { areNamesSimilar } from "../data-correlation"

export interface EntityMatch {
  confidence: number
  isMatch: boolean
  matchingFields: string[]
  conflictingFields: string[]
  reasoning: string
}

/**
 * Determine if two PersonData records refer to the same person
 */
export function resolveEntity(data1: PersonData, data2: PersonData): EntityMatch {
  const matchingFields: string[] = []
  const conflictingFields: string[] = []
  let confidence = 0
  let reasoning = ""

  // Name matching (highest weight)
  if (data1.names && data1.names.length > 0 && data2.names && data2.names.length > 0) {
    const name1 = data1.names[0]
    const name2 = data2.names[0]
    const name1Str = typeof name1 === "string" ? name1 : String(name1)
    const name2Str = typeof name2 === "string" ? name2 : String(name2)

    if (areNamesSimilar(name1Str, name2Str)) {
      matchingFields.push("name")
      confidence += 40
      reasoning += "Names match. "
    } else {
      conflictingFields.push("name")
      confidence -= 20
      reasoning += "Names do not match. "
    }
  }

  // Email matching (high weight)
  if (data1.emails && data1.emails.length > 0 && data2.emails && data2.emails.length > 0) {
    const emails1 = data1.emails.map(e => typeof e === "string" ? e.toLowerCase() : String(e).toLowerCase())
    const emails2 = data2.emails.map(e => typeof e === "string" ? e.toLowerCase() : String(e).toLowerCase())
    
    const hasMatch = emails1.some(e1 => emails2.includes(e1))
    if (hasMatch) {
      matchingFields.push("email")
      confidence += 35
      reasoning += "Email addresses match. "
    } else {
      conflictingFields.push("email")
      confidence -= 15
      reasoning += "Email addresses differ. "
    }
  }

  // Phone matching (high weight)
  if (data1.phones && data1.phones.length > 0 && data2.phones && data2.phones.length > 0) {
    const normalizePhone = (phone: string) => phone.replace(/\D/g, "")
    const phones1 = data1.phones.map(p => normalizePhone(typeof p === "string" ? p : String(p)))
    const phones2 = data2.phones.map(p => normalizePhone(typeof p === "string" ? p : String(p)))
    
    const hasMatch = phones1.some(p1 => phones2.some(p2 => p1 === p2 || p1.endsWith(p2) || p2.endsWith(p1)))
    if (hasMatch) {
      matchingFields.push("phone")
      confidence += 30
      reasoning += "Phone numbers match. "
    } else {
      conflictingFields.push("phone")
      confidence -= 10
      reasoning += "Phone numbers differ. "
    }
  }

  // Address matching (medium weight)
  if (data1.addresses && data1.addresses.length > 0 && data2.addresses && data2.addresses.length > 0) {
    const addr1 = data1.addresses[0]
    const addr2 = data2.addresses[0]
    const addr1Str = typeof addr1 === "string" ? addr1.toLowerCase() : String(addr1).toLowerCase()
    const addr2Str = typeof addr2 === "string" ? addr2.toLowerCase() : String(addr2).toLowerCase()
    
    // Check if addresses are similar (same street or same city/state)
    if (addr1Str.includes(addr2Str.split(",")[0]) || addr2Str.includes(addr1Str.split(",")[0])) {
      matchingFields.push("address")
      confidence += 20
      reasoning += "Addresses are similar. "
    } else {
      // Check if at least city/state match
      const cityState1 = addr1Str.match(/,?\s*([^,]+),\s*([A-Z]{2})/i)
      const cityState2 = addr2Str.match(/,?\s*([^,]+),\s*([A-Z]{2})/i)
      if (cityState1 && cityState2 && cityState1[1] === cityState2[1] && cityState1[2] === cityState2[2]) {
        matchingFields.push("location")
        confidence += 10
        reasoning += "Same city/state. "
      }
    }
  }

  // Determine if it's a match
  const isMatch = confidence >= 50 && matchingFields.length >= 2

  if (isMatch) {
    reasoning += `High confidence match (${confidence}%) based on ${matchingFields.length} matching fields.`
  } else if (confidence >= 30) {
    reasoning += `Possible match (${confidence}%) but needs verification.`
  } else {
    reasoning += `Low confidence (${confidence}%) - likely different persons.`
  }

  return {
    confidence: Math.max(0, Math.min(100, confidence)),
    isMatch,
    matchingFields,
    conflictingFields,
    reasoning,
  }
}

/**
 * Resolve multiple entities and group by person
 */
export function resolveEntities(entities: PersonData[]): Array<{ entities: PersonData[]; primary: PersonData; confidence: number }> {
  if (entities.length === 0) return []
  if (entities.length === 1) return [{ entities: [entities[0]], primary: entities[0], confidence: 100 }]

  const groups: Array<{ entities: PersonData[]; primary: PersonData; confidence: number }> = []

  for (const entity of entities) {
    let assigned = false

    // Try to match with existing groups
    for (const group of groups) {
      const match = resolveEntity(group.primary, entity)
      if (match.isMatch) {
        group.entities.push(entity)
        group.confidence = Math.max(group.confidence, match.confidence)
        assigned = true
        break
      }
    }

    // Create new group if no match found
    if (!assigned) {
      groups.push({
        entities: [entity],
        primary: entity,
        confidence: 100,
      })
    }
  }

  return groups
}
