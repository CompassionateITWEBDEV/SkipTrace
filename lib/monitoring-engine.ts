// Advanced monitoring engine with change detection algorithms

import type { PersonData } from "./data-correlation"

export interface ChangeDetectionResult {
  hasChanges: boolean
  changes: Change[]
  confidence: number
}

export interface Change {
  type: "new_address" | "new_phone" | "new_email" | "new_social" | "removed_data" | "updated_data"
  field: string
  oldValue?: unknown
  newValue: unknown
  confidence: number
  description: string
}

/**
 * Compare two person data objects and detect changes
 */
export function detectChanges(
  oldData: PersonData | null,
  newData: PersonData,
): ChangeDetectionResult {
  const changes: Change[] = []

  if (!oldData) {
    // First time seeing this data - everything is "new"
    if (newData.addresses && newData.addresses.length > 0) {
      changes.push({
        type: "new_address",
        field: "addresses",
        newValue: newData.addresses,
        confidence: 1.0,
        description: `Found ${newData.addresses.length} address(es)`,
      })
    }

    if (newData.phones && newData.phones.length > 0) {
      changes.push({
        type: "new_phone",
        field: "phones",
        newValue: newData.phones,
        confidence: 1.0,
        description: `Found ${newData.phones.length} phone number(s)`,
      })
    }

    if (newData.emails && newData.emails.length > 0) {
      changes.push({
        type: "new_email",
        field: "emails",
        newValue: newData.emails,
        confidence: 1.0,
        description: `Found ${newData.emails.length} email(s)`,
      })
    }

    if (newData.socialMedia && Object.keys(newData.socialMedia).length > 0) {
      changes.push({
        type: "new_social",
        field: "socialMedia",
        newValue: Object.keys(newData.socialMedia),
        confidence: 1.0,
        description: `Found ${Object.keys(newData.socialMedia).length} social media account(s)`,
      })
    }

    return {
      hasChanges: changes.length > 0,
      changes,
      confidence: changes.length > 0 ? 1.0 : 0,
    }
  }

  // Compare addresses
  const oldAddresses = normalizeArray(oldData.addresses || [])
  const newAddresses = normalizeArray(newData.addresses || [])
  const newAddressItems = newAddresses.filter((addr) => !oldAddresses.includes(addr))
  const removedAddressItems = oldAddresses.filter((addr) => !newAddresses.includes(addr))

  newAddressItems.forEach((addr) => {
    changes.push({
      type: "new_address",
      field: "addresses",
      oldValue: undefined,
      newValue: addr,
      confidence: 0.9,
      description: `New address found: ${addr}`,
    })
  })

  removedAddressItems.forEach((addr) => {
    changes.push({
      type: "removed_data",
      field: "addresses",
      oldValue: addr,
      newValue: undefined,
      confidence: 0.8,
      description: `Address removed: ${addr}`,
    })
  })

  // Compare phones
  const oldPhones = normalizeArray(oldData.phones || []).map((p) => normalizePhone(p))
  const newPhones = normalizeArray(newData.phones || []).map((p) => normalizePhone(p))
  const newPhoneItems = newPhones.filter((p) => !oldPhones.includes(p))
  const removedPhoneItems = oldPhones.filter((p) => !newPhones.includes(p))

  newPhoneItems.forEach((phone) => {
    changes.push({
      type: "new_phone",
      field: "phones",
      oldValue: undefined,
      newValue: phone,
      confidence: 0.9,
      description: `New phone number found: ${phone}`,
    })
  })

  removedPhoneItems.forEach((phone) => {
    changes.push({
      type: "removed_data",
      field: "phones",
      oldValue: phone,
      newValue: undefined,
      confidence: 0.8,
      description: `Phone number removed: ${phone}`,
    })
  })

  // Compare emails
  const oldEmails = normalizeArray(oldData.emails || []).map((e) => e.toLowerCase())
  const newEmails = normalizeArray(newData.emails || []).map((e) => e.toLowerCase())
  const newEmailItems = newEmails.filter((e) => !oldEmails.includes(e))
  const removedEmailItems = oldEmails.filter((e) => !newEmails.includes(e))

  newEmailItems.forEach((email) => {
    changes.push({
      type: "new_email",
      field: "emails",
      oldValue: undefined,
      newValue: email,
      confidence: 0.95,
      description: `New email found: ${email}`,
    })
  })

  removedEmailItems.forEach((email) => {
    changes.push({
      type: "removed_data",
      field: "emails",
      oldValue: email,
      newValue: undefined,
      confidence: 0.8,
      description: `Email removed: ${email}`,
    })
  })

  // Compare social media
  const oldSocial = Object.keys(oldData.socialMedia || {})
  const newSocial = Object.keys(newData.socialMedia || {})
  const newSocialPlatforms = newSocial.filter((p) => !oldSocial.includes(p))
  const removedSocialPlatforms = oldSocial.filter((p) => !newSocial.includes(p))

  newSocialPlatforms.forEach((platform) => {
    changes.push({
      type: "new_social",
      field: "socialMedia",
      oldValue: undefined,
      newValue: platform,
      confidence: 0.85,
      description: `New social media account: ${platform}`,
    })
  })

  removedSocialPlatforms.forEach((platform) => {
    changes.push({
      type: "removed_data",
      field: "socialMedia",
      oldValue: platform,
      newValue: undefined,
      confidence: 0.7,
      description: `Social media account removed: ${platform}`,
    })
  })

  // Calculate overall confidence
  const confidence =
    changes.length > 0
      ? changes.reduce((sum, change) => sum + change.confidence, 0) / changes.length
      : 0

  return {
    hasChanges: changes.length > 0,
    changes,
    confidence,
  }
}

/**
 * Normalize array values for comparison
 */
function normalizeArray(arr: unknown[]): string[] {
  return arr.map((item) => {
    if (typeof item === "string") return item.toLowerCase().trim()
    if (typeof item === "object" && item !== null) {
      const obj = item as Record<string, unknown>
      const value = obj.display || obj.full || obj.address || obj.number || item
      return String(value).toLowerCase().trim()
    }
    return String(item).toLowerCase().trim()
  })
}

/**
 * Normalize phone number for comparison
 */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "") // Remove all non-digits
}

/**
 * Generate change summary text
 */
export function generateChangeSummary(result: ChangeDetectionResult): string {
  if (!result.hasChanges) {
    return "No changes detected since last check."
  }

  const summaries: string[] = []

  const newAddresses = result.changes.filter((c) => c.type === "new_address")
  if (newAddresses.length > 0) {
    summaries.push(`${newAddresses.length} new address(es)`)
  }

  const newPhones = result.changes.filter((c) => c.type === "new_phone")
  if (newPhones.length > 0) {
    summaries.push(`${newPhones.length} new phone number(s)`)
  }

  const newEmails = result.changes.filter((c) => c.type === "new_email")
  if (newEmails.length > 0) {
    summaries.push(`${newEmails.length} new email(s)`)
  }

  const newSocial = result.changes.filter((c) => c.type === "new_social")
  if (newSocial.length > 0) {
    summaries.push(`${newSocial.length} new social media account(s)`)
  }

  const removed = result.changes.filter((c) => c.type === "removed_data")
  if (removed.length > 0) {
    summaries.push(`${removed.length} removed data point(s)`)
  }

  return `Changes detected: ${summaries.join(", ")}.`
}
