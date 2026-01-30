/**
 * Skip Tracing Working API - no quota/limits enforced.
 * All requests are allowed.
 */

/**
 * Check if a request is allowed. Always allows (no limits).
 */
export function checkQuota(): { allowed: true } {
  return { allowed: true }
}

/**
 * Record that one request was made. No-op when limits are disabled.
 */
export function recordRequest(): void {
  // No tracking
}
