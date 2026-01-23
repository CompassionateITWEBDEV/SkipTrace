import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db, dbOperation } from "@/lib/db"
import { addMonitoringJob } from "@/lib/queue"
import { createErrorResponse, ValidationError } from "@/lib/error-handler"

// Force dynamic rendering to prevent build-time database calls
export const dynamic = "force-dynamic"

/**
 * Monitoring API - Create and manage monitoring subscriptions
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const active = searchParams.get("active")

    const where: { userId: string; active?: boolean } = {
      userId: user.id,
    }

    if (active !== null) {
      where.active = active === "true"
    }

    const subscriptions = await dbOperation(
      () =>
        db.monitoringSubscription.findMany({
          where,
          orderBy: { createdAt: "desc" },
        }),
      [],
    )

    return NextResponse.json({ subscriptions })
  } catch (error) {
    console.error("Error fetching monitoring subscriptions:", error)
    return createErrorResponse(error, "Failed to fetch subscriptions")
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json().catch(() => ({}))
    const { targetType, targetValue, frequency = "weekly" } = body

    if (!targetType || !targetValue) {
      throw new ValidationError("targetType and targetValue are required")
    }

    if (!["email", "phone", "name"].includes(targetType.toLowerCase())) {
      throw new ValidationError("targetType must be email, phone, or name")
    }

    // Check if subscription already exists
    const existing = await dbOperation(
      () =>
        db.monitoringSubscription.findUnique({
          where: {
            userId_targetType_targetValue: {
              userId: user.id,
              targetType: targetType.toLowerCase(),
              targetValue: targetValue.trim(),
            },
          },
        }),
      null,
    )

    if (existing) {
      return NextResponse.json(
        { error: "Monitoring subscription already exists for this target" },
        { status: 400 },
      )
    }

    // Calculate next check time based on frequency
    const nextCheck = new Date()
    switch (frequency) {
      case "daily":
        nextCheck.setDate(nextCheck.getDate() + 1)
        break
      case "weekly":
        nextCheck.setDate(nextCheck.getDate() + 7)
        break
      case "monthly":
        nextCheck.setMonth(nextCheck.getMonth() + 1)
        break
      default:
        nextCheck.setDate(nextCheck.getDate() + 7)
    }

    // Create subscription
    const subscription = await dbOperation(
      () =>
        db.monitoringSubscription.create({
          data: {
            userId: user.id,
            targetType: targetType.toLowerCase(),
            targetValue: targetValue.trim(),
            frequency: frequency.toLowerCase(),
            nextCheck,
            active: true,
          },
        }),
      undefined,
    )

    if (!subscription) {
      throw new Error("Failed to create subscription")
    }

    // Add monitoring job to queue
    try {
      await addMonitoringJob({
        subscriptionId: subscription.id,
        targetType: targetType.toLowerCase(),
        targetValue: targetValue.trim(),
      })
    } catch (error) {
      console.warn("Failed to add monitoring job to queue (subscription still created):", error)
      // Don't fail the request if queue is unavailable
    }

    return NextResponse.json({ subscription }, { status: 201 })
  } catch (error) {
    console.error("Error creating monitoring subscription:", error)
    return createErrorResponse(error, "Failed to create subscription")
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Subscription ID is required" }, { status: 400 })
    }

    // Verify ownership
    const subscription = await dbOperation(
      () =>
        db.monitoringSubscription.findUnique({
          where: { id },
        }),
      null,
    )

    if (!subscription || subscription.userId !== user.id) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
    }

    await dbOperation(
      () =>
        db.monitoringSubscription.update({
          where: { id },
          data: { active: false },
        }),
      undefined,
    )

    return NextResponse.json({ message: "Subscription deactivated" })
  } catch (error) {
    console.error("Error deleting monitoring subscription:", error)
    return createErrorResponse(error, "Failed to delete subscription")
  }
}
