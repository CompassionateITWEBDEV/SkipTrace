/**
 * Shared batch search runner: runs one search for one input using the API provider layer.
 * Used by the batch-search API route and the batch-processor worker to avoid HTTP loopback.
 */

import { searchWithFailover } from "./api-providers"

export type SearchInputType = "email" | "phone" | "name" | "unknown"

export function detectSearchType(input: string): SearchInputType {
  const trimmed = input.trim()
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "email"
  if (/^\+?[\d\s\-().]{10,15}$/.test(trimmed)) return "phone"
  if (/^[a-zA-Z\s]{2,}$/.test(trimmed) && trimmed.includes(" ")) return "name"
  return "unknown"
}

export interface RunOneSearchResult {
  status: "success" | "not_found" | "error"
  results?: unknown
  error?: string
}

/**
 * Run a single search for one input (email, phone, or name). Uses provider layer with failover.
 */
export async function runOneSearch(item: string): Promise<RunOneSearchResult> {
  const type = detectSearchType(item)

  try {
    switch (type) {
      case "email": {
        const { data } = await searchWithFailover((p) => p.searchByEmail(item), { timeout: 30000 })
        return { status: "success", results: data }
      }
      case "phone": {
        let cleaned = item.replace(/[\s\-().]/g, "")
        if (!cleaned.startsWith("+")) {
          cleaned = cleaned.length === 10 ? "+1" + cleaned : "+" + cleaned
        }
        const { data } = await searchWithFailover((p) => p.searchByPhone(cleaned), { timeout: 30000 })
        return { status: "success", results: data }
      }
      case "name": {
        const parts = item.trim().split(/\s+/)
        const firstName = parts[0]
        const lastName = parts.slice(1).join(" ").trim()
        if (!firstName || !lastName) {
          return { status: "error", error: "Invalid name format. Provide first and last name." }
        }
        const { data } = await searchWithFailover((p) => p.searchByName(firstName, lastName), { timeout: 30000 })
        return { status: "success", results: data }
      }
      default:
        return { status: "error", error: "Unable to determine search type. Use email, phone, or name." }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const isNotFound = /not found|no result|404|0 record/i.test(msg)
    return {
      status: isNotFound ? "not_found" : "error",
      error: msg,
    }
  }
}
