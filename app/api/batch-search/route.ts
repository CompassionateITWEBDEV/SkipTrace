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

import { detectSearchType, runOneSearch } from "@/lib/batch-search-runner"

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
          const result = await runOneSearch(input)
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
