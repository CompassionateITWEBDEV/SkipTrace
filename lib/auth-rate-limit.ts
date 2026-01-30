// Rate limit for auth endpoints (signin/signup) to prevent brute force
// Uses cache (Redis or in-memory) keyed by client IP

import { cache } from "./cache"

const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const AUTH_RATE_LIMIT_MAX_ATTEMPTS = 10

/**
 * Get client identifier from request (IP). Uses x-forwarded-for when behind proxy.
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first
  }
  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp
  return "unknown"
}

/**
 * Check whether this client is within auth rate limit and optionally record an attempt.
 * Returns { allowed, remaining }. Call this before processing signin/signup.
 */
export async function checkAuthRateLimit(identifier: string): Promise<{
  allowed: boolean
  remaining: number
}> {
  const key = `auth:attempts:${identifier}`
  const current = (await cache.get<number>(key)) ?? 0
  if (current >= AUTH_RATE_LIMIT_MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 }
  }
  await cache.set(key, current + 1, AUTH_RATE_LIMIT_WINDOW_MS).catch(() => {})
  return {
    allowed: true,
    remaining: Math.max(0, AUTH_RATE_LIMIT_MAX_ATTEMPTS - current - 1),
  }
}
