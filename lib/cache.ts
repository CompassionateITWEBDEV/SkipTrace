// Redis-backed cache for API responses
// Falls back to in-memory cache if Redis is not available

import { Redis } from "ioredis"

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

let redisClient: Redis | null = null
let redisAvailable = false

// Initialize Redis client
async function initRedis(): Promise<boolean> {
  if (redisClient) {
    return redisAvailable
  }

  const redisHost = process.env.REDIS_HOST
  if (!redisHost) {
    console.warn("Redis not configured, using in-memory cache fallback")
    return false
  }

  try {
    const redisConfig: {
      host: string
      port: number
      password?: string
      connectTimeout: number
      retryStrategy: (times: number) => number
      maxRetriesPerRequest: number
      tls?: { rejectUnauthorized: false }
    } = {
      host: redisHost,
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD,
      connectTimeout: 5000,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
      maxRetriesPerRequest: 3,
    }

    // Enable TLS for Upstash (or other cloud Redis services)
    if (process.env.REDIS_TLS === "true" || redisHost.includes("upstash.io")) {
      redisConfig.tls = { rejectUnauthorized: false }
    }

    redisClient = new Redis(redisConfig)

    redisClient.on("error", (err) => {
      console.error("Redis client error:", err)
      redisAvailable = false
    })

    redisClient.on("connect", () => {
      console.log("Redis client connected")
      redisAvailable = true
    })

    // Test connection
    await redisClient.ping()
    redisAvailable = true
    return true
  } catch (error) {
    console.warn("Failed to connect to Redis, using in-memory cache:", error)
    redisAvailable = false
    return false
  }
}

// Fallback in-memory cache
class InMemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map()
  private defaultTTL: number = 60 * 60 * 1000 // 1 hour default

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) {
      return null
    }

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    }
    this.cache.set(key, entry)
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key)
  }

  async clear(): Promise<void> {
    this.cache.clear()
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }
}

const inMemoryCache = new InMemoryCache()

// Timeout for Redis ops so a hung connection doesn't block requests (e.g. after 1st search)
const REDIS_OP_TIMEOUT_MS = 5000

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: () => T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Redis operation timeout")), ms),
    ),
  ]).catch(() => fallback())
}

class DistributedCache {
  // Optimized TTLs based on data freshness requirements
  private defaultTTL: number = 60 * 60 * 1000 // 1 hour default for general data
  private emailTTL: number = 60 * 60 * 1000 // 1 hour for email searches (email data changes infrequently)
  private phoneTTL: number = 24 * 60 * 60 * 1000 // 24 hours for phone searches (phone data changes less frequently)
  private nameTTL: number = 6 * 60 * 60 * 1000 // 6 hours for name searches (name data changes moderately)
  private addressTTL: number = 24 * 60 * 60 * 1000 // 24 hours for address searches (address data changes infrequently)
  private comprehensiveTTL: number = 60 * 60 * 1000 // 1 hour for comprehensive searches (combined data)

  private isCacheEnabled(): boolean {
    return process.env.CACHE_ENABLED !== "false"
  }

  /**
   * Generate a cache key from query parameters
   */
  private generateKey(prefix: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${JSON.stringify(params[key])}`)
      .join("|")
    return `cache:${prefix}:${sortedParams}`
  }

  /**
   * Get cached data if it exists and hasn't expired
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isCacheEnabled()) return null

    // Try Redis first (with timeout so a hung connection doesn't block after first request)
    if (redisAvailable && redisClient) {
      try {
        const cached = await withTimeout(
          redisClient.get(key),
          REDIS_OP_TIMEOUT_MS,
          () => null as string | null,
        )
        if (cached) {
          const entry: CacheEntry<T> = JSON.parse(cached)
          const now = Date.now()
          if (now - entry.timestamp <= entry.ttl) {
            return entry.data
          } else {
            await redisClient.del(key).catch(() => {})
          }
        }
      } catch (error) {
        console.warn("Redis get error, falling back to memory:", error)
      }
    }

    return inMemoryCache.get<T>(key)
  }

  /**
   * Set data in cache with optional TTL
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    if (!this.isCacheEnabled()) return

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    }

    if (redisAvailable && redisClient) {
      try {
        const ttlSeconds = Math.floor((ttl || this.defaultTTL) / 1000)
        const ok = await withTimeout(
          redisClient.setex(key, ttlSeconds, JSON.stringify(entry)),
          REDIS_OP_TIMEOUT_MS,
          () => null as string | null,
        )
        if (ok !== null) return
      } catch (error) {
        console.warn("Redis set error, falling back to memory:", error)
      }
    }

    await inMemoryCache.set(key, data, ttl)
  }

  /**
   * Delete a cache entry
   */
  async delete(key: string): Promise<void> {
    if (redisAvailable && redisClient) {
      try {
        await redisClient.del(key)
      } catch (error) {
        console.warn("Redis delete error:", error)
      }
    }
    await inMemoryCache.delete(key)
  }

  /**
   * Clear all cache entries (use with caution)
   */
  async clear(): Promise<void> {
    if (redisAvailable && redisClient) {
      try {
        const keys = await redisClient.keys("cache:*")
        if (keys.length > 0) {
          await redisClient.del(...keys)
        }
      } catch (error) {
        console.warn("Redis clear error:", error)
      }
    }
    await inMemoryCache.clear()
  }

  /**
   * Generate cache key for skip trace queries
   */
  getSkipTraceKey(email: string): string {
    return this.generateKey("skip-trace", { email })
  }

  /**
   * Get TTL for email searches
   */
  getEmailTTL(): number {
    return this.emailTTL
  }

  /**
   * Generate cache key for phone searches
   */
  getPhoneKey(phone: string): string {
    return this.generateKey("phone", { phone })
  }

  /**
   * Get TTL for phone searches
   */
  getPhoneTTL(): number {
    return this.phoneTTL
  }

  /**
   * Generate cache key for name searches
   */
  getNameKey(firstName: string, lastName: string, city?: string, state?: string): string {
    return this.generateKey("name", { firstName, lastName, city, state })
  }

  /**
   * Get TTL for name searches
   */
  getNameTTL(): number {
    return this.nameTTL
  }

  /**
   * Generate cache key for address searches
   */
  getAddressKey(street: string, city?: string, state?: string, zip?: string): string {
    return this.generateKey("address", { street, city, state, zip })
  }

  /**
   * Get TTL for address searches
   */
  getAddressTTL(): number {
    return this.addressTTL
  }

  /**
   * Generate cache key for social media checks
   */
  getSocialMediaKey(email: string): string {
    return this.generateKey("social-media", { email })
  }

  /**
   * Get TTL for comprehensive searches
   */
  getComprehensiveTTL(): number {
    return this.comprehensiveTTL
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ size: number; keys: string[]; type: "redis" | "memory" }> {
    if (redisAvailable && redisClient) {
      try {
        const keys = await redisClient.keys("cache:*")
        return {
          size: keys.length,
          keys: keys.slice(0, 100), // Limit to first 100 keys
          type: "redis",
        }
      } catch (error) {
        console.warn("Redis stats error:", error)
      }
    }

    const memStats = inMemoryCache.getStats()
    return {
      ...memStats,
      type: "memory",
    }
  }
}

// Export singleton instance
export const cache = new DistributedCache()

// Initialize Redis on module load (server-side only)
// Skip initialization during build time to avoid connection errors
if (typeof window === "undefined") {
  // Only initialize if not in build phase
  const isBuildTime = process.env.NEXT_PHASE === "phase-production-build" || 
                      process.env.NEXT_PHASE === "phase-development-build"
  
  if (!isBuildTime) {
    initRedis().catch((error) => {
      // Only log warnings during runtime, not during builds
      console.warn("Failed to initialize Redis cache:", error)
    })
  }
}
