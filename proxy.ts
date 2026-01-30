import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// In-memory rate limit for auth routes (resets on cold start; use Redis in multi-instance)
const authLimit = 10
const windowMs = 60 * 1000
const store = new Map<string, { count: number; resetAt: number }>()

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  )
}

function isAuthRoute(pathname: string, method: string): boolean {
  if (method !== "POST") return false
  return (
    pathname === "/api/auth/signup" ||
    pathname === "/api/auth/callback/credentials" ||
    pathname === "/api/auth/signin"
  )
}

function checkAuthRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = store.get(ip)
  if (!entry) {
    store.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  entry.count++
  if (entry.count > authLimit) return false
  return true
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  if (isAuthRoute(pathname, method)) {
    const ip = getClientIp(request)
    if (!checkAuthRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": "60" } },
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/api/auth/:path*"],
}
