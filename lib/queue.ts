// Background job queue setup using BullMQ
// Note: This requires Redis to be running
// For development, you can use a local Redis instance or a service like Upstash

import { Queue, QueueEvents } from "bullmq"

// Redis connection configuration
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

/**
 * Check if Redis is available
 */
export async function isRedisAvailable(): Promise<boolean> {
  if (!process.env.REDIS_HOST) {
    return false
  }

  try {
    const Redis = (await import("ioredis")).default
    const redis = new Redis(connection)

    await new Promise<void>((resolve, reject) => {
      redis.on("connect", async () => {
        try {
          await redis.ping()
          redis.disconnect()
          resolve()
        } catch (err) {
          redis.disconnect()
          reject(err instanceof Error ? err : new Error("Redis ping error"))
        }
      })

      redis.on("error", (err: Error) => {
        redis.disconnect()
        reject(err)
      })

      redis.on("ready", async () => {
        try {
          await redis.ping()
          redis.disconnect()
          resolve()
        } catch (err) {
          redis.disconnect()
          reject(err instanceof Error ? err : new Error("Redis ping error"))
        }
      })

      redis.connect().catch(reject)

      setTimeout(() => {
        redis.disconnect()
        reject(new Error("Redis connection timeout"))
      }, 5000)
    })

    return true
  } catch (error) {
    console.warn("Redis not available:", error)
    return false
  }
}

// Queue names
export const BATCH_SEARCH_QUEUE = "batch-search"
export const MONITORING_QUEUE = "monitoring"

// Create queues
export const batchSearchQueue = new Queue(BATCH_SEARCH_QUEUE, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
})

export const monitoringQueue = new Queue(MONITORING_QUEUE, {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "fixed",
      delay: 5000,
    },
    removeOnComplete: {
      age: 24 * 3600,
    },
  },
})

// Queue events for monitoring
export const batchSearchQueueEvents = new QueueEvents(BATCH_SEARCH_QUEUE, { connection })
export const monitoringQueueEvents = new QueueEvents(MONITORING_QUEUE, { connection })

/**
 * Add a batch search job to the queue
 */
export async function addBatchSearchJob(data: {
  userId?: string
  inputs: string[]
  jobId: string
}): Promise<void> {
  const available = await isRedisAvailable()
  if (!available) {
    throw new Error("Redis is not available. Queue operations require Redis to be running.")
  }

  try {
    await batchSearchQueue.add(
      "process-batch",
      {
        inputs: data.inputs,
        userId: data.userId,
        jobId: data.jobId,
      },
      {
        jobId: data.jobId,
      },
    )
  } catch (error) {
    console.error("Failed to add batch search job to queue:", error)
    throw error
  }
}

/**
 * Add a monitoring job to the queue
 */
export async function addMonitoringJob(data: {
  subscriptionId: string
  targetType: string
  targetValue: string
}): Promise<void> {
  const available = await isRedisAvailable()
  if (!available) {
    throw new Error("Redis is not available. Queue operations require Redis to be running.")
  }

  try {
    await monitoringQueue.add(
      "check-monitoring",
      data,
      {
        jobId: `monitoring-${data.subscriptionId}-${Date.now()}`,
        repeat: {
          pattern: "0 0 * * *", // Daily at midnight (can be customized per subscription)
        },
      },
    )
  } catch (error) {
    console.error("Failed to add monitoring job to queue:", error)
    throw error
  }
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string): Promise<{
  status: string
  progress?: number
  result?: unknown
  error?: string
}> {
  const available = await isRedisAvailable()
  if (!available) {
    return { status: "queue_unavailable", error: "Redis is not available" }
  }

  try {
    const job = await batchSearchQueue.getJob(jobId)
    if (!job) {
      return { status: "not_found" }
    }

    const state = await job.getState()
    const progress = job.progress
    const result = await job.returnvalue
    const failedReason = job.failedReason

    return {
      status: state,
      progress: typeof progress === "number" ? progress : undefined,
      result,
      error: failedReason,
    }
  } catch (error) {
    console.error("Failed to get job status:", error)
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
