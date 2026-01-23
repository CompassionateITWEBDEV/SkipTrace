import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db, dbOperation } from "@/lib/db"
import { addBatchSearchJob } from "@/lib/queue"
import { createErrorResponse, ValidationError } from "@/lib/error-handler"

// Force dynamic rendering to prevent build-time database calls
export const dynamic = "force-dynamic"

interface BatchSearchItem {
  input: string
  type: "email" | "phone" | "name" | "unknown"
  status: "pending" | "processing" | "success" | "error" | "not_found"
  results?: unknown
  error?: string
}

/**
 * Detect the type of search input
 */
function detectSearchType(input: string): "email" | "phone" | "name" | "unknown" {
  const trimmed = input.trim()

  // Check if it's an email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "email"
  }

  // Check if it's a phone number (digits, may have +, spaces, dashes, parentheses)
  const phonePattern = /^\+?[\d\s\-().]{10,15}$/
  if (phonePattern.test(trimmed)) {
    return "phone"
  }

  // Check if it looks like a name (has at least one space, mostly letters)
  const namePattern = /^[a-zA-Z\s]{2,}$/
  if (namePattern.test(trimmed) && trimmed.includes(" ")) {
    return "name"
  }

  return "unknown"
}

/**
 * Process a single search item
 */
async function processSearchItem(
  item: string,
  _apiKey: string,
): Promise<{ status: string; results?: unknown; error?: string }> {
  const type = detectSearchType(item)

  try {
    switch (type) {
      case "email": {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/skip-trace`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: item }),
        })

        if (response.ok) {
          const data = await response.json()
          return { status: "success", results: data }
        } else {
          const errorData = await response.json()
          return { status: errorData.error?.includes("not found") ? "not_found" : "error", error: errorData.error }
        }
      }

      case "phone": {
        let cleanedPhone = item.replace(/[\s\-().]/g, "")
        if (!cleanedPhone.startsWith("+")) {
          if (cleanedPhone.length === 10) {
            cleanedPhone = "+1" + cleanedPhone
          } else {
            cleanedPhone = "+" + cleanedPhone
          }
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/search-phone`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: cleanedPhone }),
        })

        if (response.ok) {
          const data = await response.json()
          return { status: "success", results: data }
        } else {
          const errorData = await response.json()
          return { status: errorData.error?.includes("not found") ? "not_found" : "error", error: errorData.error }
        }
      }

      case "name": {
        const nameParts = item.trim().split(/\s+/)
        const firstName = nameParts[0]
        const lastName = nameParts.slice(1).join(" ")

        if (!firstName || !lastName) {
          return { status: "error", error: "Invalid name format. Please provide first and last name." }
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/search-name`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstName, lastName }),
        })

        if (response.ok) {
          const data = await response.json()
          return { status: "success", results: data }
        } else {
          const errorData = await response.json()
          return { status: errorData.error?.includes("not found") ? "not_found" : "error", error: errorData.error }
        }
      }

      default:
        return { status: "error", error: "Unable to determine search type. Please use email, phone, or name format." }
    }
  } catch (error) {
    console.error(`Error processing search item "${item}":`, error)
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { inputs, maxConcurrency = 5 } = body

    if (!inputs || !Array.isArray(inputs)) {
      throw new ValidationError("Inputs array is required", "inputs")
    }

    if (inputs.length === 0) {
      throw new ValidationError("At least one input is required", "inputs")
    }

    if (inputs.length > 100) {
      throw new ValidationError(
        "Maximum 100 items per batch. For larger batches, please contact support.",
        "inputs",
      )
    }

    const apiKey = process.env.RAPIDAPI_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    // Filter out empty lines and trim
    const validInputs = inputs
      .map((input: string) => input.trim())
      .filter((input: string) => input.length > 0)

    if (validInputs.length === 0) {
      return NextResponse.json({ error: "No valid inputs provided" }, { status: 400 })
    }

    // Get current user if authenticated
    let userId: string | undefined
    try {
      const user = await getCurrentUser()
      userId = user?.id
    } catch {
      // User not authenticated - continue without user context
    }

    // For small batches (< 20), process synchronously
    // For larger batches, create a background job
    if (validInputs.length < 20) {
      // Process searches with limited concurrency
      const results: BatchSearchItem[] = []
      const concurrency = Math.min(maxConcurrency, 10) // Cap at 10 concurrent requests

      for (let i = 0; i < validInputs.length; i += concurrency) {
        const batch = validInputs.slice(i, i + concurrency)
        const batchPromises = batch.map(async (input: string) => {
          const type = detectSearchType(input)
          const result = await processSearchItem(input, apiKey)
          return {
            input,
            type,
            status: result.status as "pending" | "processing" | "success" | "error" | "not_found",
            results: result.results,
            error: result.error,
          }
        })

        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults)
      }

      // Calculate summary statistics
      const summary = {
        total: results.length,
        successful: results.filter((r) => r.status === "success").length,
        notFound: results.filter((r) => r.status === "not_found").length,
        errors: results.filter((r) => r.status === "error").length,
      }

      return NextResponse.json({
        success: true,
        summary,
        results,
        processedAt: new Date().toISOString(),
      })
    } else {
      // Create background job for large batches
      const job = await db.batchJob.create({
        data: {
          userId: userId || null,
          status: "PENDING",
          inputCount: validInputs.length,
        },
      })

      // Add to queue
      try {
        await addBatchSearchJob({
          userId,
          inputs: validInputs,
          jobId: job.id,
        })
      } catch (error) {
        // If queue is not available, update job status
        console.error("Failed to add job to queue:", error)
        await dbOperation(
          () =>
            db.batchJob.update({
              where: { id: job.id },
              data: {
                status: "FAILED",
                error: error instanceof Error ? error.message : "Queue unavailable",
              },
            }),
          undefined,
        )
        throw error
      }

      return NextResponse.json({
        success: true,
        jobId: job.id,
        message: "Batch job created. Use the job ID to check status.",
        status: "pending",
      })
    }
  } catch (error) {
    console.error("Batch search error:", error)
    return createErrorResponse(error, "Failed to process batch search")
  }
}
