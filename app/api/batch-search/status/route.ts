import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { createErrorResponse } from "@/lib/error-handler"

// Force dynamic rendering to prevent build-time database calls
export const dynamic = "force-dynamic"

/**
 * Get batch job status by jobId query parameter
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get("jobId")

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 })
    }

    // Get job from database
    const jobResult = await db.batchJob.findUnique({
      where: { id: jobId },
    })

    if (!jobResult) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    // Type assertion: Prisma + driver adapter can infer 'never' after null check in some builds
    type BatchJobRow = {
      id: string
      userId: string | null
      status: string
      inputCount: number
      processedCount: number
      successCount: number
      errorCount: number
      results: unknown
      error: string | null
      createdAt: Date
      updatedAt: Date
      completedAt: Date | null
    }
    const job = jobResult as BatchJobRow

    // Verify ownership
    if (job.userId && job.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json({
      id: job.id,
      status: job.status,
      inputCount: job.inputCount,
      processedCount: job.processedCount,
      successCount: job.successCount,
      errorCount: job.errorCount,
      results: job.results,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
      progress: job.inputCount > 0 ? Math.round((job.processedCount / job.inputCount) * 100) : 0,
    })
  } catch (error) {
    console.error("Error fetching batch job status:", error)
    return createErrorResponse(error, "Failed to fetch batch job status")
  }
}
