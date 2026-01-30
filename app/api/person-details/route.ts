import { type NextRequest, NextResponse } from "next/server"
import { getPersonDetails } from "@/lib/skip-trace-client"
import { createErrorResponse, ValidationError } from "@/lib/error-handler"

/**
 * GET /api/person-details?peo_id=...
 * POST /api/person-details with body { peo_id: "..." }
 * Returns full person details (emails, phones, addresses, relatives, associates) from Skip Tracing Working API.
 */
export async function GET(request: NextRequest) {
  const peo_id = request.nextUrl.searchParams.get("peo_id")
  if (!peo_id || typeof peo_id !== "string" || peo_id.trim().length === 0) {
    return NextResponse.json(
      { error: "peo_id is required (query: ?peo_id=...)" },
      { status: 400 },
    )
  }
  return fetchPersonDetails(peo_id.trim())
}

export async function POST(request: NextRequest) {
  let peo_id: string | undefined
  try {
    const body = await request.json().catch(() => ({}))
    peo_id = typeof body.peo_id === "string" ? body.peo_id.trim() : undefined
  } catch {
    peo_id = undefined
  }
  if (!peo_id || peo_id.length === 0) {
    throw new ValidationError("peo_id is required in body", "peo_id")
  }
  return fetchPersonDetails(peo_id)
}

async function fetchPersonDetails(peo_id: string): Promise<NextResponse<unknown>> {
  try {
    const data = await getPersonDetails(peo_id)
    return NextResponse.json(data)
  } catch (error) {
    console.error("Person details API error:", error)
    return createErrorResponse(error, "Failed to fetch person details")
  }
}
