// Shared API utilities for error handling and response formatting

import { NextResponse } from "next/server"
import { validateApiKey } from "./config"

export interface ApiError {
  error: string
  code?: string
  statusCode: number
}

/**
 * Standard error response formatter
 */
export function formatErrorResponse(
  error: string | Error,
  statusCode: number = 500,
  code?: string,
): NextResponse {
  const errorMessage = error instanceof Error ? error.message : error

  return NextResponse.json(
    {
      error: errorMessage,
      code: code || getErrorCode(statusCode),
      timestamp: new Date().toISOString(),
    },
    { status: statusCode },
  )
}

/**
 * Get error code from status code
 */
function getErrorCode(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return "BAD_REQUEST"
    case 401:
      return "UNAUTHORIZED"
    case 403:
      return "FORBIDDEN"
    case 404:
      return "NOT_FOUND"
    case 429:
      return "RATE_LIMIT_EXCEEDED"
    case 500:
      return "INTERNAL_SERVER_ERROR"
    case 503:
      return "SERVICE_UNAVAILABLE"
    default:
      return "UNKNOWN_ERROR"
  }
}

/**
 * Handle API errors with proper logging and response formatting
 */
export function handleApiError(error: unknown, context?: string): NextResponse {
  const errorContext = context ? `${context}: ` : ""

  if (error instanceof Error) {
    console.error(`${errorContext}${error.message}`, error.stack)
    return formatErrorResponse(error.message, 500)
  }

  const errorMessage = typeof error === "string" ? error : "An unexpected error occurred"
  console.error(`${errorContext}${errorMessage}`)
  return formatErrorResponse(errorMessage, 500)
}

/**
 * Validate API key and return error response if missing
 */
export function validateApiKeyOrError(): NextResponse | null {
  if (!validateApiKey()) {
    return formatErrorResponse("API key not configured", 500, "CONFIGURATION_ERROR")
  }
  return null
}

/**
 * Check if error indicates "not found" (should be treated as info, not error)
 */
export function isNotFoundError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes("not found") ||
      message.includes("404") ||
      message.includes("no records") ||
      message.includes("no data")
    )
  }
  return false
}

/**
 * Check if error indicates rate limiting
 */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return message.includes("rate limit") || message.includes("429") || message.includes("too many requests")
  }
  return false
}

/**
 * Parse external API error response
 */
export function parseExternalApiError(response: Response, defaultMessage: string): string {
  // Try to extract meaningful error message from response
  if (response.status === 404) {
    return "No records found"
  }
  if (response.status === 429) {
    return "Rate limit exceeded. Please try again later."
  }
  if (response.status === 403) {
    return "API access forbidden. Please check your API key."
  }
  if (response.status >= 500) {
    return "External API service error. Please try again later."
  }
  return defaultMessage
}

/**
 * Success response formatter
 */
export function formatSuccessResponse<T>(data: T, statusCode: number = 200): NextResponse {
  return NextResponse.json(data, { status: statusCode })
}
