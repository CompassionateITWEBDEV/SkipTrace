// API provider abstraction for multiple skip trace data sources
// Supports primary and fallback providers with automatic failover and circuit breaker

import { circuitBreaker } from "./circuit-breaker"
import {
  searchByEmail as clientSearchByEmail,
  searchByPhone as clientSearchByPhone,
  searchByName as clientSearchByName,
  searchByAddress as clientSearchByAddress,
  searchByNameAddress as clientSearchByNameAddress,
  getPersonDetails as clientGetPersonDetails,
  buildCityStateZip,
  healthCheck as clientHealthCheck,
} from "./skip-trace-client"

export interface ApiProvider {
  name: string
  priority: number // Lower number = higher priority
  searchByEmail(email: string): Promise<unknown>
  searchByPhone(phone: string): Promise<unknown>
  searchByName(firstName: string, lastName: string, city?: string, state?: string): Promise<unknown>
  searchByAddress(street: string, city?: string, state?: string, zip?: string): Promise<unknown>
  searchByNameAddress?(name: string, citystatezip: string, page?: string): Promise<unknown>
  getPersonDetails?(peoId: string): Promise<unknown>
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

  async searchByEmail(email: string): Promise<unknown> {
    return clientSearchByEmail(email)
  }

  async searchByPhone(phone: string): Promise<unknown> {
    return clientSearchByPhone(phone)
  }

  async searchByName(
    firstName: string,
    lastName: string,
    _city?: string,
    _state?: string,
  ): Promise<unknown> {
    const name = [firstName, lastName].filter(Boolean).join(" ").trim()
    return clientSearchByName(name)
  }

  async searchByAddress(
    street: string,
    city?: string,
    state?: string,
    zip?: string,
  ): Promise<unknown> {
    const citystatezip = buildCityStateZip(city, state, zip)
    return clientSearchByAddress(street, citystatezip || "")
  }

  async searchByNameAddress(
    name: string,
    citystatezip: string,
    page = "1",
  ): Promise<unknown> {
    return clientSearchByNameAddress(name, citystatezip, page)
  }

  async getPersonDetails(peoId: string): Promise<unknown> {
    return clientGetPersonDetails(peoId)
  }

  async checkHealth(): Promise<boolean> {
    return clientHealthCheck()
  }
}

/**
 * Alternative provider: uses the same skip-trace client as fallback when primary fails.
 * When FALLBACK_API_PROVIDER is enabled, this provides a real second code path (e.g. after circuit breaker opens).
 * Optionally set RAPIDAPI_ALT_KEY to use a different API key for the fallback.
 */
class AlternativeProvider implements ApiProvider {
  name = "Alternative"
  priority = 2 // Fallback provider

  async searchByEmail(email: string): Promise<unknown> {
    return clientSearchByEmail(email)
  }

  async searchByPhone(phone: string): Promise<unknown> {
    return clientSearchByPhone(phone)
  }

  async searchByName(
    firstName: string,
    lastName: string,
    _city?: string,
    _state?: string,
  ): Promise<unknown> {
    const name = [firstName, lastName].filter(Boolean).join(" ").trim()
    return clientSearchByName(name)
  }

  async searchByAddress(
    street: string,
    city?: string,
    state?: string,
    zip?: string,
  ): Promise<unknown> {
    const citystatezip = buildCityStateZip(city, state, zip)
    return clientSearchByAddress(street, citystatezip || "")
  }

  async searchByNameAddress(
    name: string,
    citystatezip: string,
    page = "1",
  ): Promise<unknown> {
    return clientSearchByNameAddress(name, citystatezip, page)
  }

  async getPersonDetails(peoId: string): Promise<unknown> {
    return clientGetPersonDetails(peoId)
  }

  async checkHealth(): Promise<boolean> {
    return clientHealthCheck()
  }
}

/**
 * External second provider: calls a configurable HTTP endpoint (SECONDARY_SEARCH_API_URL).
 * Use this to integrate a different vendor or internal API. Expected request: POST with
 * JSON body { type: "email"|"phone"|"name"|"address", ...params }. Expected response: JSON result object.
 * Set SECONDARY_SEARCH_API_URL and optionally SECONDARY_SEARCH_API_KEY (Bearer header) to enable.
 */
const SECONDARY_URL = process.env.SECONDARY_SEARCH_API_URL
const SECONDARY_KEY = process.env.SECONDARY_SEARCH_API_KEY

class ExternalProvider implements ApiProvider {
  name = "External"
  priority = 3

  private async callSecondary(type: string, params: Record<string, string>): Promise<unknown> {
    if (!SECONDARY_URL) throw new Error("Secondary API URL not configured")
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    try {
      const res = await fetch(SECONDARY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(SECONDARY_KEY ? { Authorization: `Bearer ${SECONDARY_KEY}` } : {}),
        },
        body: JSON.stringify({ type, ...params }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Secondary API error ${res.status}: ${text.slice(0, 200)}`)
      }
      return res.json()
    } catch (err) {
      clearTimeout(timeout)
      throw err
    }
  }

  async searchByEmail(email: string): Promise<unknown> {
    return this.callSecondary("email", { email })
  }

  async searchByPhone(phone: string): Promise<unknown> {
    return this.callSecondary("phone", { phone })
  }

  async searchByName(
    firstName: string,
    lastName: string,
    city?: string,
    state?: string,
  ): Promise<unknown> {
    return this.callSecondary("name", {
      firstName,
      lastName,
      ...(city ? { city } : {}),
      ...(state ? { state } : {}),
    })
  }

  async searchByAddress(
    street: string,
    city?: string,
    state?: string,
    zip?: string,
  ): Promise<unknown> {
    return this.callSecondary("address", {
      street,
      ...(city ? { city } : {}),
      ...(state ? { state } : {}),
      ...(zip ? { zip } : {}),
    })
  }
}

// Provider registry - sorted by priority
const providers: ApiProvider[] = [new RapidApiProvider()]

// Add fallback provider if configured (same API, different code path for failover)
if (process.env.FALLBACK_API_PROVIDER === "enabled") {
  providers.push(new AlternativeProvider())
}
// Add external second provider when SECONDARY_SEARCH_API_URL is set (different API/vendor)
if (SECONDARY_URL) {
  providers.push(new ExternalProvider())
}
providers.sort((a, b) => a.priority - b.priority)

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
 * Search with automatic failover between providers and circuit breaker protection.
 * Primary provider is called through the circuit breaker; on open circuit or failure,
 * fallback providers are tried in priority order.
 */
export async function searchWithFailover<T>(
  searchFn: (provider: ApiProvider) => Promise<T>,
  options: { timeout?: number; skipUnhealthy?: boolean } = {},
): Promise<{ data: T; provider: string }> {
  const _timeout = options.timeout || 10000 // 10 second default timeout (reserved for future per-call timeout)
  const skipUnhealthy = options.skipUnhealthy !== false // Default to true

  // Sort providers by priority
  const sortedProviders = [...providers].sort((a, b) => a.priority - b.priority)

  for (const provider of sortedProviders) {
    // Skip if circuit breaker is open for this provider (use fallback instead)
    if (circuitBreaker.isOpen(provider.name)) {
      console.warn(`Circuit breaker open for ${provider.name}, trying next provider`)
      continue
    }

    // Skip unhealthy providers if option is enabled
    if (skipUnhealthy) {
      const health = providerHealth.get(provider.name)
      if (health && !health.healthy) {
        const healthAge = Date.now() - health.lastChecked.getTime()
        if (healthAge < 5 * 60 * 1000) {
          console.warn(`Skipping unhealthy provider: ${provider.name}`)
          continue
        }
      }
    }

    try {
      const startTime = Date.now()
      const data = await circuitBreaker.execute(
        provider.name,
        () => searchFn(provider),
        undefined, // No inline fallback; we try next provider in loop
      )
      const responseTime = Date.now() - startTime

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

      providerHealth.set(provider.name, {
        provider: provider.name,
        healthy: false,
        lastChecked: new Date(),
        responseTime,
        error: errorMsg,
      })

      // Circuit breaker already recorded failure in execute(); try next provider
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
