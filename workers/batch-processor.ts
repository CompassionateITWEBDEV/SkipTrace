// Background worker for processing batch search jobs
// This should be run as a separate process or in a background service

import { Worker } from "bullmq"
import { BATCH_SEARCH_QUEUE } from "../lib/queue"
import { db } from "../lib/db"
import { runOneSearch } from "../lib/batch-search-runner"
import type { Prisma } from "@prisma/client"

const redisHost = process.env.REDIS_HOST || "localhost"
const connection: {
  host: string
  port: number
  password?: string
  maxRetriesPerRequest: number | null
  retryStrategy: (times: number) => number
  enableReadyCheck: boolean
  connectTimeout: number
  tls?: { rejectUnauthorized: boolean }
} = {
  host: redisHost,
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // BullMQ requires this to be null
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
  enableReadyCheck: true,
  connectTimeout: 10000,
}

// Enable TLS for Upstash (or other cloud Redis services)
if (process.env.REDIS_TLS === "true" || redisHost.includes("upstash.io")) {
  connection.tls = { rejectUnauthorized: false }
}

// Create worker
const batchSearchWorker = new Worker(
  BATCH_SEARCH_QUEUE,
  async (job: { data: { inputs: string[]; userId: string; jobId: string } }) => {
    const { inputs, userId: _userId, jobId } = job.data

    // Update job status to processing
    await db.batchJob.update({
      where: { id: jobId },
      data: { status: "PROCESSING" },
    })

    const results: Array<{
      input: string
      status: string
      results?: unknown
      error?: string
    }> = []

    let processedCount = 0
    let successCount = 0
    let errorCount = 0

    // Process each input (with concurrency limit)
    const concurrency = 5
    for (let i = 0; i < inputs.length; i += concurrency) {
      const batch = inputs.slice(i, i + concurrency)

      const batchPromises = batch.map(async (input: string) => {
        try {
          const result = await runOneSearch(input)
          if (result.status === "success") {
            successCount++
          } else {
            errorCount++
          }
          results.push({
            input,
            status: result.status,
            results: result.results,
            error: result.error,
          })
        } catch (error) {
          errorCount++
          results.push({
            input,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          })
        } finally {
          processedCount++
          // Update progress - BullMQ jobs have updateProgress method
          const jobWithProgress = job as unknown as { updateProgress?: (progress: number) => Promise<void> }
          if (typeof jobWithProgress.updateProgress === 'function') {
            await jobWithProgress.updateProgress((processedCount / inputs.length) * 100)
          }
        }
      })

      await Promise.all(batchPromises)

      // Update job progress in database
      await db.batchJob.update({
        where: { id: jobId },
        data: {
          processedCount,
          successCount,
          errorCount,
        },
      })
    }

    // Mark job as completed
    await db.batchJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        results: results as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    })

    return { results, summary: { total: inputs.length, success: successCount, errors: errorCount } }
  },
  {
    connection,
    concurrency: 1, // Process one batch job at a time
  },
)

batchSearchWorker.on("completed", (job) => {
  console.log(`Batch job ${job?.id} completed`)
})

batchSearchWorker.on("failed", (job, err) => {
  console.error(`Batch job ${job?.id} failed:`, err)
  // Update job status in database
  if (job?.data?.jobId) {
    db.batchJob
      .update({
        where: { id: job.data?.jobId },
        data: { status: "FAILED", error: err.message },
      })
      .catch(console.error)
  }
})

// Export worker for use in separate process
export { batchSearchWorker }

// If running as standalone script
if (require.main === module) {
  console.log("Batch search worker started")
}
