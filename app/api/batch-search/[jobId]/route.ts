import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getJobStatus } from "@/lib/queue"

// Force dynamic rendering to prevent build-time database calls
export const dynamic = "force-dynamic"

/**
 * Get batch job status and results
 */
export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const user = await requireAuth()
    const { jobId } = await params

    // Get job from database
    const job = await db.batchJob.findUnique({
      where: { id: jobId },
    })

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    // Verify ownership
    if (job.userId && job.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get job status from queue if available
    let queueStatus = null
    try {
      queueStatus = await getJobStatus(jobId)
    } catch (error) {
      // Queue might not be available, use database status
      console.warn("Could not get queue status:", error)
    }

    return NextResponse.json({
      job: {
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
      },
      queueStatus,
      progress: job.inputCount > 0 ? (job.processedCount / job.inputCount) * 100 : 0,
    })
  } catch (error) {
    console.error("Error fetching batch job:", error)
    return NextResponse.json({ error: "Failed to fetch batch job" }, { status: 500 })
  }
}
