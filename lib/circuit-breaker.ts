// Circuit breaker pattern for external API calls
// Prevents cascading failures by temporarily stopping requests to failing services

export interface CircuitBreakerOptions {
  failureThreshold: number // Number of failures before opening circuit
  resetTimeout: number // Time in ms before attempting to close circuit
  monitoringPeriod: number // Time window for tracking failures
}

export interface CircuitState {
  state: "closed" | "open" | "half-open"
  failures: number
  lastFailureTime: number | null
  successCount: number
}

class CircuitBreaker {
  private circuits: Map<string, CircuitState> = new Map()
  private options: CircuitBreakerOptions

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      resetTimeout: options.resetTimeout || 60000, // 1 minute
      monitoringPeriod: options.monitoringPeriod || 60000, // 1 minute
    }
  }

  /**
   * Get or create circuit state for a service
   */
  private getCircuit(serviceName: string): CircuitState {
    if (!this.circuits.has(serviceName)) {
      this.circuits.set(serviceName, {
        state: "closed",
        failures: 0,
        lastFailureTime: null,
        successCount: 0,
      })
    }
    return this.circuits.get(serviceName)!
  }

  /**
   * Check if circuit is open (blocking requests)
   */
  isOpen(serviceName: string): boolean {
    const circuit = this.getCircuit(serviceName)

    if (circuit.state === "open") {
      // Check if we should transition to half-open
      if (
        circuit.lastFailureTime &&
        Date.now() - circuit.lastFailureTime > this.options.resetTimeout
      ) {
        circuit.state = "half-open"
        circuit.successCount = 0
        return false // Allow one request through
      }
      return true // Still blocking
    }

    return false
  }

  /**
   * Record a successful call
   */
  recordSuccess(serviceName: string): void {
    const circuit = this.getCircuit(serviceName)

    if (circuit.state === "half-open") {
      circuit.successCount++
      // If we get a few successes, close the circuit
      if (circuit.successCount >= 2) {
        circuit.state = "closed"
        circuit.failures = 0
        circuit.successCount = 0
      }
    } else if (circuit.state === "closed") {
      // Reset failure count on success (decay over time)
      if (circuit.failures > 0) {
        circuit.failures = Math.max(0, circuit.failures - 1)
      }
    }
  }

  /**
   * Record a failed call
   */
  recordFailure(serviceName: string): void {
    const circuit = this.getCircuit(serviceName)

    circuit.failures++
    circuit.lastFailureTime = Date.now()

    if (circuit.state === "half-open") {
      // Failed again, reopen circuit
      circuit.state = "open"
      circuit.successCount = 0
    } else if (circuit.state === "closed" && circuit.failures >= this.options.failureThreshold) {
      // Too many failures, open the circuit
      circuit.state = "open"
      console.warn(`Circuit breaker opened for ${serviceName} after ${circuit.failures} failures`)
    }
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    serviceName: string,
    fn: () => Promise<T>,
    fallback?: () => Promise<T>,
  ): Promise<T> {
    if (this.isOpen(serviceName)) {
      console.warn(`Circuit breaker is open for ${serviceName}, using fallback or throwing error`)
      if (fallback) {
        return fallback()
      }
      throw new Error(`Service ${serviceName} is currently unavailable (circuit breaker open)`)
    }

    try {
      const result = await fn()
      this.recordSuccess(serviceName)
      return result
    } catch (error) {
      this.recordFailure(serviceName)
      throw error
    }
  }

  /**
   * Get circuit state for monitoring
   */
  getState(serviceName: string): CircuitState {
    return { ...this.getCircuit(serviceName) }
  }

  /**
   * Manually reset a circuit
   */
  reset(serviceName: string): void {
    const circuit = this.getCircuit(serviceName)
    circuit.state = "closed"
    circuit.failures = 0
    circuit.lastFailureTime = null
    circuit.successCount = 0
  }
}

// Export singleton instance
export const circuitBreaker = new CircuitBreaker()
