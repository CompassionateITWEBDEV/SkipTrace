import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createErrorResponse, ValidationError } from "@/lib/error-handler"
import { randomBytes } from "crypto"

// Force dynamic rendering to prevent build-time database calls
export const dynamic = "force-dynamic"

/**
 * Get user's webhook configurations
 */
export async function GET() {
  try {
    const user = await requireAuth()

    const webhooks = await db.webhook.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        url: true,
        events: true,
        active: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ webhooks })
  } catch (error) {
    console.error("Error fetching webhooks:", error)
    return createErrorResponse(error, "Failed to fetch webhooks")
  }
}

/**
 * Create a new webhook configuration
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { url, events, secret } = body

    if (!url || typeof url !== "string") {
      throw new ValidationError("Webhook URL is required")
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      throw new ValidationError("At least one event type is required")
    }

    try {
      new URL(url)
    } catch {
      throw new ValidationError("Invalid webhook URL format")
    }

    const secretToStore =
      typeof secret === "string" && secret.trim().length > 0
        ? secret.trim()
        : randomBytes(32).toString("base64url")

    const webhook = await db.webhook.create({
      data: {
        userId: user.id,
        url: url.trim(),
        secret: secretToStore,
        events: events.map((e: unknown) => String(e)),
        active: true,
      },
      select: {
        id: true,
        url: true,
        events: true,
        active: true,
        createdAt: true,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: "Webhook configuration saved",
        webhook,
        secret: secretToStore,
      },
      { status: 201 },
    )
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
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const webhookId = searchParams.get("id")

    if (!webhookId) {
      throw new ValidationError("Webhook ID is required")
    }

    const webhook = await db.webhook.findFirst({
      where: { id: webhookId, userId: user.id },
    })

    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 })
    }

    await db.webhook.delete({
      where: { id: webhookId },
    })

    return NextResponse.json({ message: "Webhook deleted" })
  } catch (error) {
    console.error("Error deleting webhook:", error)
    return createErrorResponse(error, "Failed to delete webhook")
  }
}
