// Centralized configuration validation and management

interface AppConfig {
  rapidApiKey: string
  baseUrl: string
  nodeEnv: string
}

let config: AppConfig | null = null

/**
 * Validate and load configuration from environment variables
 */
export function loadConfig(): AppConfig {
  if (config) {
    return config
  }

  const rapidApiKey = process.env.RAPIDAPI_KEY
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  const nodeEnv = process.env.NODE_ENV || "development"

  // Validate required configuration
  if (!rapidApiKey && nodeEnv === "production") {
    console.error("ERROR: RAPIDAPI_KEY is required in production environment")
    throw new Error("RAPIDAPI_KEY environment variable is not set")
  }

  if (!rapidApiKey && nodeEnv !== "production") {
    console.warn("WARNING: RAPIDAPI_KEY is not set. API calls will fail.")
  }

  config = {
    rapidApiKey: rapidApiKey || "",
    baseUrl,
    nodeEnv,
  }

  return config
}

/**
 * Get the current configuration
 */
export function getConfig(): AppConfig {
  return loadConfig()
}

/**
 * Validate API key is configured
 */
export function validateApiKey(): boolean {
  const cfg = getConfig()
  return !!cfg.rapidApiKey
}

// Load config on module initialization
if (typeof window === "undefined") {
  // Server-side only
  try {
    loadConfig()
  } catch (error) {
    console.error("Failed to load configuration:", error)
  }
}
