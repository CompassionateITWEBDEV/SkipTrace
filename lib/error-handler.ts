// Centralized error handling utilities

import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"

export interface ApiError {
  message: string
  code?: string
  statusCode: number
  details?: unknown
}

/**
 * Custom error classes for better error handling
 */
export class DatabaseError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message)
    this.name = "DatabaseError"
  }
}

export class ExternalApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: unknown,
  ) {
    super(message)
    this.name = "ExternalApiError"
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message)
    this.name = "ValidationError"
  }
}

export class RateLimitError extends Error {
  constructor(message: string, public remaining?: number) {
    super(message)
    this.name = "RateLimitError"
  }
}

/**
 * Handle Prisma errors and convert to user-friendly messages
 */
export function handlePrismaError(error: unknown): ApiError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return {
          message: "A record with this value already exists",
          code: "UNIQUE_CONSTRAINT",
          statusCode: 409,
          details: error.meta,
        }
      case "P2025":
        return {
          message: "Record not found",
          code: "NOT_FOUND",
          statusCode: 404,
        }
      case "P2003":
        return {
          message: "Invalid reference to related record",
          code: "FOREIGN_KEY_CONSTRAINT",
          statusCode: 400,
          details: error.meta,
        }
      case "P2014":
        return {
          message: "Invalid relation operation",
          code: "RELATION_ERROR",
          statusCode: 400,
          details: error.meta,
        }
      default:
        return {
          message: "Database operation failed",
          code: error.code,
          statusCode: 500,
          details: error.meta,
        }
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      message: "Invalid data provided",
      code: "VALIDATION_ERROR",
      statusCode: 400,
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      message: "Database connection failed. Please try again later.",
      code: "CONNECTION_ERROR",
      statusCode: 503,
    }
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return {
      message: "Database engine error. Please contact support.",
      code: "ENGINE_ERROR",
      statusCode: 500,
    }
  }

  // Unknown Prisma error
  return {
    message: "Database error occurred",
    code: "DATABASE_ERROR",
    statusCode: 500,
  }
}

/**
 * Handle external API errors
 */
export function handleExternalApiError(error: unknown, apiName?: string): ApiError {
  if (error instanceof ExternalApiError) {
    return {
      message: error.message,
      code: "EXTERNAL_API_ERROR",
      statusCode: error.statusCode || 502,
    }
  }

  if (error instanceof Error) {
    // Check for common network errors
    if (error.message.includes("ECONNREFUSED") || error.message.includes("ENOTFOUND")) {
      return {
        message: `${apiName || "External service"} is currently unavailable`,
        code: "SERVICE_UNAVAILABLE",
        statusCode: 503,
      }
    }

    if (error.message.includes("timeout")) {
      return {
        message: `${apiName || "External service"} request timed out`,
        code: "TIMEOUT",
        statusCode: 504,
      }
    }
  }

  return {
    message: apiName ? `${apiName} request failed` : "External API request failed",
    code: "EXTERNAL_API_ERROR",
    statusCode: 502,
  }
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: unknown,
  defaultMessage = "An error occurred",
  defaultStatusCode = 500,
): NextResponse {
  let apiError: ApiError

  if (error instanceof DatabaseError) {
    apiError = handlePrismaError(error.originalError || error)
  } else if (error instanceof ExternalApiError) {
    apiError = handleExternalApiError(error)
  } else if (error instanceof ValidationError) {
    apiError = {
      message: error.message,
      code: "VALIDATION_ERROR",
      statusCode: 400,
      details: error.field ? { field: error.field } : undefined,
    }
  } else if (error instanceof RateLimitError) {
    apiError = {
      message: error.message,
      code: "RATE_LIMIT_EXCEEDED",
      statusCode: 429,
      details: error.remaining !== undefined ? { remaining: error.remaining } : undefined,
    }
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    apiError = handlePrismaError(error)
  } else if (error instanceof Error) {
    // Log unexpected errors for debugging
    console.error("Unexpected error:", error)
    apiError = {
      message: process.env.NODE_ENV === "production" ? defaultMessage : error.message,
      code: "INTERNAL_ERROR",
      statusCode: defaultStatusCode,
    }
  } else {
    console.error("Unknown error type:", error)
    apiError = {
      message: defaultMessage,
      code: "UNKNOWN_ERROR",
      statusCode: defaultStatusCode,
    }
  }

  const response: Record<string, unknown> = {
    error: apiError.message,
    code: apiError.code,
  }

  if (apiError.details) {
    response.details = apiError.details
  }

  return NextResponse.json(response, { status: apiError.statusCode })
}

/**
 * Wrap an async function with error handling
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<NextResponse>>(
  fn: T,
  defaultMessage?: string,
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (error) {
      return createErrorResponse(error, defaultMessage)
    }
  }) as T
}
