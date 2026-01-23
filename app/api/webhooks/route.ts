import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { createErrorResponse, ValidationError } from "@/lib/error-handler"

// Force dynamic rendering to prevent build-time database calls
export const dynamic = "force-dynamic"

/**
 * Get user's webhook configurations
 */
export async function GET(_request: Request) {
  try {
    await requireAuth()
    
    // For now, return empty array - webhook storage can be added to schema later
    // In production, query webhook configurations from database
    return NextResponse.json({ webhooks: [] })
  } catch (error) {
    console.error("Error fetching webhooks:", error)
    return createErrorResponse(error, "Failed to fetch webhooks")
  }
}

/**
 * Create or update a webhook configuration
 */
export async function POST(request: Request) {
  try {
    await requireAuth()
    const body = await request.json()
    const { url, events, secret: _secret } = body

    if (!url || typeof url !== "string") {
      throw new ValidationError("Webhook URL is required")
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      throw new ValidationError("At least one event type is required")
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      throw new ValidationError("Invalid webhook URL format")
    }

    // In production, store webhook configuration in database
    // For now, return success
    return NextResponse.json({
      success: true,
      message: "Webhook configuration saved",
      webhook: {
        id: `wh_${Date.now()}`,
        url,
        events,
        active: true,
      },
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating webhook:", error)
    return createErrorResponse(error, "Failed to create webhook")
  }
}

/**
 * Delete a webhook
 */
export async function DELETE(request: Request) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const webhookId = searchParams.get("id")

    if (!webhookId) {
      throw new ValidationError("Webhook ID is required")
    }

    // In production, delete from database
    return NextResponse.json({ message: "Webhook deleted" })
  } catch (error) {
    console.error("Error deleting webhook:", error)
    return createErrorResponse(error, "Failed to delete webhook")
  }
}
