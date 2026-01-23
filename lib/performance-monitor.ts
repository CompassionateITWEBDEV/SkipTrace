// Performance monitoring utilities for API routes

export interface PerformanceMetrics {
  route: string
  method: string
  duration: number
  statusCode: number
  timestamp: Date
  userId?: string
}

// In-memory metrics store (in production, use a proper metrics service)
const metrics: PerformanceMetrics[] = []
const MAX_METRICS = 1000 // Keep last 1000 metrics

/**
 * Record a performance metric
 */
export function recordMetric(metric: PerformanceMetrics): void {
  metrics.push(metric)

  // Keep only the last MAX_METRICS
  if (metrics.length > MAX_METRICS) {
    metrics.shift()
  }
}

/**
 * Get performance statistics for a route
 */
export function getRouteStats(route: string, method: string = "GET"): {
  count: number
  avgDuration: number
  p95Duration: number
  p99Duration: number
  errorRate: number
} {
  const routeMetrics = metrics.filter(
    (m) => m.route === route && m.method === method,
  )

  if (routeMetrics.length === 0) {
    return {
      count: 0,
      avgDuration: 0,
      p95Duration: 0,
      p99Duration: 0,
      errorRate: 0,
    }
  }

  const durations = routeMetrics.map((m) => m.duration).sort((a, b) => a - b)
  const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length
  const p95Index = Math.floor(durations.length * 0.95)
  const p99Index = Math.floor(durations.length * 0.99)

  const errors = routeMetrics.filter((m) => m.statusCode >= 400).length
  const errorRate = (errors / routeMetrics.length) * 100

  return {
    count: routeMetrics.length,
    avgDuration: Math.round(avgDuration),
    p95Duration: durations[p95Index] || 0,
    p99Duration: durations[p99Index] || 0,
    errorRate: Math.round(errorRate * 10) / 10,
  }
}

/**
 * Get all route statistics
 */
export function getAllRouteStats(): Record<string, ReturnType<typeof getRouteStats>> {
  const routes = new Set(metrics.map((m) => `${m.method} ${m.route}`))
  const stats: Record<string, ReturnType<typeof getRouteStats>> = {}

  routes.forEach((routeKey) => {
    const [method, ...routeParts] = routeKey.split(" ")
    const route = routeParts.join(" ")
    stats[routeKey] = getRouteStats(route, method)
  })

  return stats
}

/**
 * Middleware to measure API route performance
 */
export function withPerformanceMonitoring<T>(
  route: string,
  method: string,
  handler: () => Promise<T>,
  userId?: string,
): Promise<T> {
  const startTime = Date.now()

  return handler()
    .then((result) => {
      const duration = Date.now() - startTime
      recordMetric({
        route,
        method,
        duration,
        statusCode: 200,
        timestamp: new Date(),
        userId,
      })
      return result
    })
    .catch((error) => {
      const duration = Date.now() - startTime
      const statusCode = error instanceof Error && "status" in error ? (error.status as number) : 500
      recordMetric({
        route,
        method,
        duration,
        statusCode,
        timestamp: new Date(),
        userId,
      })
      throw error
    })
}
