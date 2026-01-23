import { NextResponse } from "next/server"
import { testDatabaseConnection } from "@/lib/db"
import Redis from "ioredis"

// Force dynamic rendering
export const dynamic = "force-dynamic"

/**
 * Health check endpoint
 * Returns status of database, Redis, and overall system health
 */
export async function GET() {
  const health: {
    status: "healthy" | "degraded" | "unhealthy"
    timestamp: string
    services: {
      database: { status: "up" | "down"; responseTime?: number }
      redis: { status: "up" | "down"; responseTime?: number }
    }
  } = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      database: { status: "down" },
      redis: { status: "down" },
    },
  }

  // Check database
  try {
    const dbStart = Date.now()
    const dbConnected = await testDatabaseConnection()
    const dbResponseTime = Date.now() - dbStart

    health.services.database = {
      status: dbConnected ? "up" : "down",
      responseTime: dbResponseTime,
    }

    if (!dbConnected) {
      health.status = "unhealthy"
    }
  } catch (error) {
    console.error("Database health check failed:", error)
    health.services.database.status = "down"
    health.status = "unhealthy"
  }

  // Check Redis (if configured)
  const redisHost = process.env.REDIS_HOST
  if (redisHost) {
    try {
      const redisStart = Date.now()
      const redisConfig: {
        host: string
        port: number
        password?: string
        connectTimeout: number
        retryStrategy: () => null
        tls?: { rejectUnauthorized: boolean }
      } = {
        host: redisHost,
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD,
        connectTimeout: 5000,
        retryStrategy: () => null, // Don't retry for health check
      }

      // Enable TLS for Upstash
      if (process.env.REDIS_TLS === "true" || redisHost.includes("upstash.io")) {
        redisConfig.tls = { rejectUnauthorized: false }
      }

      const redis = new Redis(redisConfig)

      await new Promise<void>((resolve, reject) => {
        redis.on("connect", async () => {
          try {
            const result = await redis.ping()
            redis.disconnect()
            if (result !== "PONG") {
              reject(new Error("Redis ping failed"))
            } else {
              resolve()
            }
          } catch (err) {
            redis.disconnect()
            reject(err instanceof Error ? err : new Error("Redis ping error"))
          }
        })

        redis.on("error", (err: Error) => {
          redis.disconnect()
          reject(err)
        })

        redis.connect().catch(reject)

        // Timeout after 5 seconds
        setTimeout(() => {
          redis.disconnect()
          reject(new Error("Redis connection timeout"))
        }, 5000)
      })

      const redisResponseTime = Date.now() - redisStart
      health.services.redis = {
        status: "up",
        responseTime: redisResponseTime,
      }
    } catch (error) {
      console.error("Redis health check failed:", error)
      health.services.redis.status = "down"
      // Redis failure doesn't make system unhealthy if database is up
      if (health.status === "healthy") {
        health.status = "degraded"
      }
    }
  }

  const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503

  return NextResponse.json(health, { status: statusCode })
}
