import { NextResponse } from "next/server"
import { db, dbOperation } from "@/lib/db"
import { createErrorResponse } from "@/lib/error-handler"
import { logAuditEvent } from "@/lib/audit-log"
import { stripe, verifyWebhookSignature } from "@/lib/stripe"

type Plan = "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE"

// Force dynamic rendering to prevent build-time database calls
export const dynamic = "force-dynamic"

/**
 * Stripe webhook handler for billing events.
 * Verifies signature, finds user by stripeCustomerId, and updates plan only for that user.
 */
export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 })
    }
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 503 })
    }

    let event: { type: string; data: { object: Record<string, unknown> } }
    try {
      event = verifyWebhookSignature(body, signature) as unknown as {
        type: string
        data: { object: Record<string, unknown> }
      }
    } catch (err) {
      console.error("Stripe webhook signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as {
          customer?: string
          metadata?: { userId?: string }
        }
        const customerId = session.customer
        const userId = session.metadata?.userId
        if (userId && customerId) {
          await db.user.update({
            where: { id: userId },
            data: { stripeCustomerId: customerId },
          })
        }
        break
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as {
          id: string
          customer: string
          items?: { data?: Array<{ price?: { id?: string } }> }
        }
        const customerId = subscription.customer
        const priceId = subscription.items?.data?.[0]?.price?.id
        const plan = mapStripePlanToAppPlan(priceId)

        const updated = await dbOperation(
          () =>
            db.user.updateMany({
              where: { stripeCustomerId: customerId },
              data: { plan },
            }),
          undefined,
        )

        if (updated.count > 0) {
          await logAuditEvent({
            action: "subscription_updated",
            resource: "billing",
            resourceId: subscription.id,
            details: { plan, customerId },
          }).catch(console.error)
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as { customer: string }
        const customerId = subscription.customer

        await db.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { plan: "FREE" },
        })
        break
      }

      case "invoice.payment_succeeded": {
        console.log("Payment succeeded:", (event.data.object as { id: string }).id)
        break
      }

      case "invoice.payment_failed": {
        console.log("Payment failed:", (event.data.object as { id: string }).id)
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Stripe webhook error:", error)
    return createErrorResponse(error, "Webhook handler failed")
  }
}

/**
 * Map Stripe price ID to app plan.
 * Uses env STRIPE_PRICE_* or common Stripe price ID patterns.
 */
function mapStripePlanToAppPlan(priceId: string | undefined): Plan {
  if (!priceId) return "FREE"

  const planMap: Record<string, Plan> = {
    [process.env.STRIPE_PRICE_STARTER || "price_starter"]: "STARTER",
    [process.env.STRIPE_PRICE_PROFESSIONAL || "price_professional"]: "PROFESSIONAL",
    [process.env.STRIPE_PRICE_ENTERPRISE || "price_enterprise"]: "ENTERPRISE",
  }

  return planMap[priceId] ?? "FREE"
}
