// Background worker for processing monitoring subscriptions
// This should be run as a separate process or in a background service

import { Worker } from "bullmq"
import { MONITORING_QUEUE } from "../lib/queue"
import { db, dbOperation } from "../lib/db"
import { getConfig } from "../lib/config"
import { sendMonitoringAlert } from "../lib/notifications"
import { detectChanges, type ChangeDetectionResult } from "../lib/monitoring-engine"
import type { PersonData } from "../lib/data-correlation"

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
 * Perform a monitoring check for a subscription
 */
/**
 * Extract PersonData from search result
 */
function extractPersonData(data: unknown): PersonData | null {
  if (!data || typeof data !== "object") return null

  const obj = data as Record<string, unknown>
  const skipTrace = (obj.skipTrace || obj.skipTraceData) as Record<string, unknown> | undefined
  const person = skipTrace?.person || (skipTrace?.data as Record<string, unknown>)?.person

  if (!person) return null

  const personObj = person as Record<string, unknown>

  return {
    names: extractArray(personObj.names),
    emails: extractArray(personObj.emails),
    phones: extractArray(personObj.phones),
    addresses: extractArray(personObj.addresses),
    socialMedia: obj.socialMedia as Record<string, unknown> | undefined,
    employmentHistory: Array.isArray(personObj.jobs) ? personObj.jobs : undefined,
  }
}

function extractArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => {
      if (typeof v === "string") return v
      if (typeof v === "object" && v !== null) {
        const obj = v as Record<string, unknown>
        return String(obj.display || obj.full || obj.address || obj.number || obj.email || v)
      }
      return String(v)
    })
  }
  if (value) {
    return [String(value)]
  }
  return []
}

async function performMonitoringCheck(
  subscriptionId: string,
  targetType: string,
  targetValue: string,
): Promise<{
  changed: boolean
  newData?: unknown
  error?: string
  changes?: string[]
  changeDetails?: unknown[]
  confidence?: number
}> {
  try {
    // Get the subscription to check last known data
    const subscription = await dbOperation(
      () =>
        db.monitoringSubscription.findUnique({
          where: { id: subscriptionId },
        }),
      null,
    )

    if (!subscription || !subscription.active) {
      return { changed: false, error: "Subscription not found or inactive" }
    }

    const apiKey = getConfig().rapidApiKey
    if (!apiKey) {
      return { changed: false, error: "API key not configured" }
    }

    let currentData: unknown = null

    // Perform search based on target type
    switch (targetType.toLowerCase()) {
      case "email": {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/skip-trace`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: targetValue }),
          },
        )

        if (response.ok) {
          currentData = await response.json()
        } else {
          return { changed: false, error: "Failed to fetch email data" }
        }
        break
      }

      case "phone": {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/search-phone`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: targetValue }),
          },
        )

        if (response.ok) {
          currentData = await response.json()
        } else {
          return { changed: false, error: "Failed to fetch phone data" }
        }
        break
      }

      case "name": {
        const nameParts = targetValue.split(" ")
        if (nameParts.length < 2) {
          return { changed: false, error: "Invalid name format" }
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/search-name`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              firstName: nameParts[0],
              lastName: nameParts.slice(1).join(" "),
            }),
          },
        )

        if (response.ok) {
          currentData = await response.json()
        } else {
          return { changed: false, error: "Failed to fetch name data" }
        }
        break
      }

      default:
        return { changed: false, error: `Unsupported target type: ${targetType}` }
    }

    // Get last known data from the most recent report
    let lastKnownPersonData: PersonData | null = null
    try {
      const recentReport = await dbOperation(
        () =>
          db.report.findFirst({
            where: {
              userId: subscription.userId,
              query: {
                contains: targetValue,
              },
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          }),
        null,
      )

      if (recentReport) {
        lastKnownPersonData = extractPersonData(recentReport.results)
      }
    } catch (error) {
      console.warn("Failed to fetch last known data:", error)
    }

    // Extract person data from current result
    const currentPersonData = extractPersonData(currentData)

    // Use monitoring engine to detect changes
    let changeResult: ChangeDetectionResult | null = null
    if (currentPersonData) {
      changeResult = detectChanges(lastKnownPersonData, currentPersonData)
    }

    const changed = changeResult?.hasChanges || false
    const changeDescriptions = changeResult
      ? changeResult.changes.map((c) => c.description)
      : []

    // Update subscription with last check time
    const nextCheck = new Date()
    switch (subscription.frequency) {
      case "daily":
        nextCheck.setDate(nextCheck.getDate() + 1)
        break
      case "weekly":
        nextCheck.setDate(nextCheck.getDate() + 7)
        break
      case "monthly":
        nextCheck.setMonth(nextCheck.getMonth() + 1)
        break
      default:
        nextCheck.setDate(nextCheck.getDate() + 7) // Default to weekly
    }

    await dbOperation(
      () =>
        db.monitoringSubscription.update({
          where: { id: subscriptionId },
          data: {
            lastChecked: new Date(),
            nextCheck,
          },
        }),
      undefined,
    )

    // If changes detected, create a report and send notification
    if (changed && currentData) {
      // Create a report for the new data
      try {
        await dbOperation(
          () =>
            db.report.create({
              data: {
                userId: subscription.userId,
                title: `Monitoring Alert: ${targetType} ${targetValue}`,
                query: JSON.stringify({ targetType, targetValue }),
                results: currentData as never,
                searchType: targetType.toUpperCase() as "EMAIL" | "PHONE" | "NAME" | "ADDRESS",
              },
            }),
          undefined,
        )

        // Send notification
        if (changeDescriptions.length > 0) {
          await sendMonitoringAlert(
            subscription.userId,
            subscriptionId,
            targetType,
            targetValue,
            changeDescriptions,
          )
        }
      } catch (error) {
        console.error("Failed to create monitoring report:", error)
      }
    }

    return {
      changed,
      newData: currentData,
      changes: changeDescriptions,
      changeDetails: changeResult?.changes || [],
      confidence: changeResult?.confidence || 0,
    }
  } catch (error) {
    console.error(`Monitoring check failed for ${subscriptionId}:`, error)
    return {
      changed: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Create worker
const monitoringWorker = new Worker(
  MONITORING_QUEUE,
  async (job: { data: { subscriptionId: string; targetType: string; targetValue: string } }) => {
    const { subscriptionId, targetType, targetValue } = job.data

    console.log(`Processing monitoring check for subscription ${subscriptionId}`)

    const result = await performMonitoringCheck(subscriptionId, targetType, targetValue)

    if (result.changed && result.newData) {
      console.log(`Change detected for subscription ${subscriptionId}`, {
        changes: result.changes,
      })
    } else if (result.error) {
      console.error(`Monitoring check failed for subscription ${subscriptionId}:`, result.error)
    }

    return result
  },
  {
    connection,
    concurrency: 5, // Process up to 5 monitoring checks concurrently
  },
)

monitoringWorker.on("completed", (job) => {
  console.log(`Monitoring check ${job?.id} completed`)
})

monitoringWorker.on("failed", (job, err) => {
  console.error(`Monitoring check ${job?.id} failed:`, err)
})

// Export worker for use in separate process
export { monitoringWorker }

// If running as standalone script
if (require.main === module) {
  console.log("Monitoring worker started")
}
