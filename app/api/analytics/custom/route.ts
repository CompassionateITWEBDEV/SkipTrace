import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { generateCustomReport } from "@/lib/analytics-engine"
import { createErrorResponse, ValidationError } from "@/lib/error-handler"

// SearchType enum values matching Prisma schema
type SearchType = "EMAIL" | "PHONE" | "NAME" | "ADDRESS" | "COMPREHENSIVE" | "BATCH"

// Force dynamic rendering
export const dynamic = "force-dynamic"

/**
 * Generate custom analytics report
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json().catch(() => ({}))
    const {
      startDate,
      endDate,
      searchTypes,
      minSuccessRate,
    }: {
      startDate?: string
      endDate?: string
      searchTypes?: string[]
      minSuccessRate?: number
    } = body

    // Validate dates
    const start = startDate ? new Date(startDate) : undefined
    const end = endDate ? new Date(endDate) : undefined

    if (start && isNaN(start.getTime())) {
      throw new ValidationError("Invalid start date format")
    }

    if (end && isNaN(end.getTime())) {
      throw new ValidationError("Invalid end date format")
    }

    if (start && end && start > end) {
      throw new ValidationError("Start date must be before end date")
    }

    // Validate search types
    const validSearchTypes: SearchType[] = [
      "EMAIL",
      "PHONE",
      "NAME",
      "ADDRESS",
      "COMPREHENSIVE",
      "BATCH",
    ]
    const types = searchTypes
      ?.filter((t) => validSearchTypes.includes(t as SearchType))
      .map((t) => t as SearchType)

    // Validate success rate
    if (minSuccessRate !== undefined && (minSuccessRate < 0 || minSuccessRate > 100)) {
      throw new ValidationError("Success rate must be between 0 and 100")
    }

    const report = await generateCustomReport({
      userId: user.id,
      startDate: start,
      endDate: end,
      searchTypes: types,
      minSuccessRate,
    })

    return NextResponse.json(report)
  } catch (error) {
    console.error("Error generating custom report:", error)
    return createErrorResponse(error, "Failed to generate custom report")
  }
}
