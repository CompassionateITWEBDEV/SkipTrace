import { NextRequest, NextResponse } from "next/server"
import { db, dbOperation } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { createErrorResponse, ValidationError } from "@/lib/error-handler"

// Force dynamic rendering to prevent build-time database calls
export const dynamic = "force-dynamic"

/**
 * Versioned API Gateway for public API access
 * Routes: /api/v1/search/email, /api/v1/search/phone, etc.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ endpoint: string[] }> }) {
  const resolvedParams = await params
  return handleRequest(request, resolvedParams, "GET")
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ endpoint: string[] }> }) {
  const resolvedParams = await params
  return handleRequest(request, resolvedParams, "POST")
}

async function handleRequest(
  request: NextRequest,
  params: { endpoint: string[] },
  method: string,
): Promise<NextResponse> {
  try {
    // Extract API key from Authorization header
    const authHeader = request.headers.get("authorization")
    const apiKey = authHeader?.replace("Bearer ", "") || request.headers.get("x-api-key")

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "API key required",
          message: "Include your API key in the Authorization header as 'Bearer <key>' or in the 'x-api-key' header",
        },
        { status: 401 },
      )
    }

    // Validate API key
    const keyRecord = await dbOperation(
      () =>
        db.apiKey.findUnique({
          where: { key: apiKey },
          include: { user: true },
        }),
      null,
    )

    if (!keyRecord || !keyRecord.user) {
      return NextResponse.json(
        {
          error: "Invalid API key",
          message: "The provided API key is not valid. Please check your key and try again.",
        },
        { status: 401 },
      )
    }

    // Check if key is expired
    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      return NextResponse.json(
        {
          error: "API key has expired",
          message: "Your API key has expired. Please generate a new key from your account settings.",
        },
        { status: 401 },
      )
    }

    // Update last used timestamp
    await dbOperation(
      () =>
        db.apiKey.update({
          where: { id: keyRecord.id },
          data: { lastUsed: new Date() },
        }),
      undefined,
    )

    const user = keyRecord.user

    // Check rate limits
    const rateLimitCheck = await checkRateLimit(user.id, user.plan, "search")
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: rateLimitCheck.reason || "Rate limit exceeded",
          remaining: rateLimitCheck.remaining,
        },
        { status: 429 },
      )
    }

    // Route to appropriate endpoint
    const endpoint = params.endpoint.join("/")
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

    // Map v1 endpoints to internal endpoints
    const endpointMap: Record<string, string> = {
      "search/email": "/api/skip-trace",
      "search/phone": "/api/search-phone",
      "search/name": "/api/search-name",
      "search/address": "/api/search-address",
      "search/comprehensive": "/api/enrich-data",
      "validate/email": "/api/validate-email",
      "validate/phone": "/api/validate-phone",
    }

    const internalEndpoint = endpointMap[endpoint]
    if (!internalEndpoint) {
      return NextResponse.json({ error: `Endpoint not found: ${endpoint}` }, { status: 404 })
    }

    // Forward request to internal endpoint
    let body: string | undefined
    if (method === "POST") {
      try {
        body = await request.text()
      } catch {
        throw new ValidationError("Failed to read request body")
      }
    }

    const internalResponse = await fetch(`${baseUrl}${internalEndpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        // Pass user context for logging
        "x-user-id": user.id,
        "x-api-key-id": keyRecord.id,
      },
      body,
      signal: AbortSignal.timeout(60000), // 60 second timeout for API calls
    })

    const responseData = await internalResponse.json().catch(() => ({
      error: "Failed to parse response from internal endpoint",
    }))

    // Return response with API versioning headers
    return NextResponse.json(responseData, {
      status: internalResponse.status,
      headers: {
        "X-API-Version": "v1",
        "X-RateLimit-Remaining": String(rateLimitCheck.remaining || 0),
        "X-RateLimit-Reset": String(
          new Date(Date.now() + 24 * 60 * 60 * 1000).getTime() / 1000,
        ), // Reset at end of day
        "X-Request-ID":
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `req-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        "Content-Type": "application/json",
      },
    })
  } catch (error) {
    console.error("API Gateway error:", error)
    return createErrorResponse(error, "API request failed")
  }
}
