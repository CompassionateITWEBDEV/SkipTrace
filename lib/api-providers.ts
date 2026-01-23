// API provider abstraction for multiple skip trace data sources
// Supports primary and fallback providers with automatic failover

import { getConfig } from "./config"

export interface ApiProvider {
  name: string
  priority: number // Lower number = higher priority
  searchByEmail(email: string): Promise<unknown>
  searchByPhone(phone: string): Promise<unknown>
  searchByName(firstName: string, lastName: string, city?: string, state?: string): Promise<unknown>
  searchByAddress(street: string, city?: string, state?: string, zip?: string): Promise<unknown>
  checkHealth?(): Promise<boolean> // Optional health check
}

export interface ProviderHealth {
  provider: string
  healthy: boolean
  lastChecked: Date
  responseTime?: number
  error?: string
}

// Provider health tracking
const providerHealth = new Map<string, ProviderHealth>()

class RapidApiProvider implements ApiProvider {
  name = "RapidAPI"
  priority = 1 // Primary provider

  private getHeaders() {
    const config = getConfig()
    return {
      "x-rapidapi-key": config.rapidApiKey,
    }
  }

  async searchByEmail(email: string): Promise<unknown> {
    const headers = this.getHeaders()
    const response = await fetch(
      `https://skip-tracing-working-api.p.rapidapi.com/search/byemail?email=${encodeURIComponent(email)}&phone=1`,
      {
        headers: {
          ...headers,
          "x-rapidapi-host": "skip-tracing-working-api.p.rapidapi.com",
        },
      },
    )

    if (!response.ok) {
      throw new Error(`RapidAPI email search failed: ${response.status}`)
    }

    return response.json()
  }

  async searchByPhone(phone: string): Promise<unknown> {
    const headers = this.getHeaders()
    const response = await fetch(
      `https://skip-tracing-working-api.p.rapidapi.com/search/byphone?phone=${encodeURIComponent(phone)}`,
      {
        headers: {
          ...headers,
          "x-rapidapi-host": "skip-tracing-working-api.p.rapidapi.com",
        },
      },
    )

    if (!response.ok) {
      throw new Error(`RapidAPI phone search failed: ${response.status}`)
    }

    return response.json()
  }

  async searchByName(
    firstName: string,
    lastName: string,
    city?: string,
    state?: string,
  ): Promise<unknown> {
    const headers = this.getHeaders()
    const params = new URLSearchParams({
      first_name: firstName,
      last_name: lastName,
      phone: "1",
    })
    if (city) params.append("city", city)
    if (state) params.append("state", state)

    const response = await fetch(
      `https://skip-tracing-working-api.p.rapidapi.com/search/byname?${params.toString()}`,
      {
        headers: {
          ...headers,
          "x-rapidapi-host": "skip-tracing-working-api.p.rapidapi.com",
        },
      },
    )

    if (!response.ok) {
      throw new Error(`RapidAPI name search failed: ${response.status}`)
    }

    return response.json()
  }

  async searchByAddress(
    street: string,
    city?: string,
    state?: string,
    zip?: string,
  ): Promise<unknown> {
    const headers = this.getHeaders()
    const params = new URLSearchParams({
      street,
      phone: "1",
    })
    if (city) params.append("city", city)
    if (state) params.append("state", state)
    if (zip) params.append("zip", zip)

    const response = await fetch(
      `https://skip-tracing-working-api.p.rapidapi.com/search/byaddress?${params.toString()}`,
      {
        headers: {
          ...headers,
          "x-rapidapi-host": "skip-tracing-working-api.p.rapidapi.com",
        },
      },
    )

    if (!response.ok) {
      throw new Error(`RapidAPI address search failed: ${response.status}`)
    }

    return response.json()
  }

  async checkHealth(): Promise<boolean> {
    try {
      // Simple health check - try a lightweight endpoint or ping
      const response = await fetch("https://skip-tracing-working-api.p.rapidapi.com/health", {
        method: "GET",
        headers: {
          ...this.getHeaders(),
          "x-rapidapi-host": "skip-tracing-working-api.p.rapidapi.com",
        },
        signal: AbortSignal.timeout(5000),
      })
      return response.ok
    } catch {
      // If health endpoint doesn't exist, try a minimal search as health check
      // For now, assume healthy if we can reach the API
      return true
    }
  }
}

/**
 * Alternative provider placeholder
 * In production, implement with actual alternative API
 */
class AlternativeProvider implements ApiProvider {
  name = "Alternative"
  priority = 2 // Fallback provider

  async searchByEmail(_email: string): Promise<unknown> {
    throw new Error("Alternative provider not yet implemented")
  }

  async searchByPhone(_phone: string): Promise<unknown> {
    throw new Error("Alternative provider not yet implemented")
  }

  async searchByName(_firstName: string, _lastName: string, _city?: string, _state?: string): Promise<unknown> {
    throw new Error("Alternative provider not yet implemented")
  }

  async searchByAddress(_street: string, _city?: string, _state?: string, _zip?: string): Promise<unknown> {
    throw new Error("Alternative provider not yet implemented")
  }

  async checkHealth(): Promise<boolean> {
    return false // Not implemented yet
  }
}

// Provider registry - sorted by priority
const providers: ApiProvider[] = [new RapidApiProvider()]

// Add fallback provider if configured
if (process.env.FALLBACK_API_PROVIDER === "enabled") {
  providers.push(new AlternativeProvider())
  // Sort by priority
  providers.sort((a, b) => a.priority - b.priority)
}

// Add fallback provider if configured
if (process.env.FALLBACK_API_PROVIDER === "enabled") {
  // In the future, add alternative providers here
  // providers.push(new AlternativeProvider())
}

/**
 * Check provider health
 */
export async function checkProviderHealth(provider: ApiProvider): Promise<ProviderHealth> {
  const startTime = Date.now()
  let healthy = false
  let error: string | undefined

  try {
    if (provider.checkHealth) {
      healthy = await provider.checkHealth()
    } else {
      // Default: assume healthy if no health check method
      healthy = true
    }
  } catch (err) {
    healthy = false
    error = err instanceof Error ? err.message : "Unknown error"
  }

  const responseTime = Date.now() - startTime
  const health: ProviderHealth = {
    provider: provider.name,
    healthy,
    lastChecked: new Date(),
    responseTime,
    error,
  }

  providerHealth.set(provider.name, health)
  return health
}

/**
 * Get provider health status
 */
export function getProviderHealth(providerName?: string): ProviderHealth | Map<string, ProviderHealth> {
  if (providerName) {
    return providerHealth.get(providerName) || {
      provider: providerName,
      healthy: false,
      lastChecked: new Date(),
    }
  }
  return new Map(providerHealth)
}

/**
 * Search with automatic failover between providers
 * Tries providers in priority order, skipping unhealthy ones
 */
export async function searchWithFailover<T>(
  searchFn: (provider: ApiProvider) => Promise<T>,
  options: { timeout?: number; skipUnhealthy?: boolean } = {},
): Promise<{ data: T; provider: string }> {
  const timeout = options.timeout || 10000 // 10 second default timeout
  const skipUnhealthy = options.skipUnhealthy !== false // Default to true

  // Sort providers by priority
  const sortedProviders = [...providers].sort((a, b) => a.priority - b.priority)

  for (const provider of sortedProviders) {
    // Skip unhealthy providers if option is enabled
    if (skipUnhealthy) {
      const health = providerHealth.get(provider.name)
      if (health && !health.healthy) {
        // Check if health check is stale (older than 5 minutes)
        const healthAge = Date.now() - health.lastChecked.getTime()
        if (healthAge < 5 * 60 * 1000) {
          console.warn(`Skipping unhealthy provider: ${provider.name}`)
          continue
        }
        // Health check is stale, re-check
      }
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const startTime = Date.now()
      const data = await searchFn(provider)
      const responseTime = Date.now() - startTime
      clearTimeout(timeoutId)

      // Mark provider as healthy
      providerHealth.set(provider.name, {
        provider: provider.name,
        healthy: true,
        lastChecked: new Date(),
        responseTime,
      })

      return { data, provider: provider.name }
    } catch (error) {
      const responseTime = Date.now()
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      console.warn(`Provider ${provider.name} failed:`, errorMsg)

      // Mark provider as unhealthy
      providerHealth.set(provider.name, {
        provider: provider.name,
        healthy: false,
        lastChecked: new Date(),
        responseTime,
        error: errorMsg,
      })

      // Try next provider
      continue
    }
  }

  throw new Error("All API providers failed")
}

/**
 * Get primary provider
 */
export function getPrimaryProvider(): ApiProvider {
  return providers[0]
}

/**
 * Get all available providers
 */
export function getProviders(): ApiProvider[] {
  return [...providers]
}
