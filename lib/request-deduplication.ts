// Request deduplication to prevent duplicate API calls within a short time window

interface PendingRequest<T> {
  promise: Promise<T>
  timestamp: number
}

// In-memory store for pending requests (keyed by request identifier)
const pendingRequests = new Map<string, PendingRequest<unknown>>()

// Cleanup interval to remove stale entries (5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000
const REQUEST_WINDOW = 2000 // 2 seconds - deduplicate requests within this window

// Start cleanup interval
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, request] of pendingRequests.entries()) {
      if (now - request.timestamp > CLEANUP_INTERVAL) {
        pendingRequests.delete(key)
      }
    }
  }, CLEANUP_INTERVAL)
}

/**
 * Deduplicate requests - if the same request is made within REQUEST_WINDOW ms,
 * return the existing promise instead of making a new request
 */
export async function deduplicateRequest<T>(
  key: string,
  requestFn: () => Promise<T>,
  windowMs: number = REQUEST_WINDOW,
): Promise<T> {
  const existing = pendingRequests.get(key)

  // If there's a pending request within the window, return it
  if (existing && Date.now() - existing.timestamp < windowMs) {
    return existing.promise as Promise<T>
  }

  // Create new request
  const promise = requestFn().finally(() => {
    // Remove from pending requests after completion (with a small delay to allow concurrent requests)
    setTimeout(() => {
      pendingRequests.delete(key)
    }, windowMs)
  })

  pendingRequests.set(key, {
    promise,
    timestamp: Date.now(),
  })

  return promise
}

/**
 * Generate a deduplication key from request parameters
 */
export function generateDedupKey(prefix: string, params: Record<string, unknown>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}:${JSON.stringify(params[key])}`)
    .join("|")
  return `dedup:${prefix}:${sortedParams}`
}

/**
 * Clear all pending requests (useful for testing or cleanup)
 */
export function clearPendingRequests(): void {
  pendingRequests.clear()
}
