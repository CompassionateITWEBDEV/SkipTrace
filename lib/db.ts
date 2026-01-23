// Database client for Prisma
// This file ensures we have a single instance of PrismaClient
// Prisma 7: Connection URL is configured in prisma.config.ts

import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
}

/**
 * Retry connection with exponential backoff
 */
async function retryConnection<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000,
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt)
        console.warn(`Database connection attempt ${attempt + 1} failed, retrying in ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error("Database connection failed after retries")
}

/**
 * Test database connection
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const client = getPrismaClient()
    await retryConnection(() => client.$queryRaw`SELECT 1`)
    return true
  } catch (error) {
    console.error("Database connection test failed:", error)
    return false
  }
}

function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma
  }

  // Create PostgreSQL connection pool
  // During build time, DATABASE_URL might not be set, so use a placeholder
  // The actual connection will be established at runtime
  const connectionString =
    process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/skiptrace"

  // Reuse pool if it exists
  const pool =
    globalForPrisma.pool ??
    new Pool({
      connectionString,
      // Connection pool settings for better reliability
      max: 10, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 10000, // Increased timeout for Supabase (was 2000ms)
      // SSL configuration is handled via connection string parameters (sslmode=no-verify for dev)
      // Connection errors during build are expected and handled gracefully
    })

  // Handle pool errors gracefully
  pool.on("error", (err) => {
    console.error("Unexpected database pool error:", err)
  })

  if (!globalForPrisma.pool) {
    globalForPrisma.pool = pool
  }

  const adapter = new PrismaPg(pool)

  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client
  }

  return client
}

/**
 * Wrapper for database operations with error handling
 */
export async function dbOperation<T>(
  operation: () => Promise<T>,
  fallback?: T,
): Promise<T> {
  try {
    return await retryConnection(operation)
  } catch (error) {
    console.error("Database operation failed:", error)
    if (fallback !== undefined) {
      return fallback
    }
    throw error
  }
}

export const db = getPrismaClient()
