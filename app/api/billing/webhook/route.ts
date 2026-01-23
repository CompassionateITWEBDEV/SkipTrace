import { NextResponse } from "next/server"
import { db, dbOperation } from "@/lib/db"
import type { Plan } from "@prisma/client"
import { createErrorResponse } from "@/lib/error-handler"
import { logAuditEvent } from "@/lib/audit-log"

// Force dynamic rendering to prevent build-time database calls
export const dynamic = "force-dynamic"

/**
 * Stripe webhook handler for billing events
 * This handles subscription updates, payments, etc.
 */
export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 })
    }

    // In production, verify the Stripe signature
    // const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)

    // For now, parse the event manually
    const event = JSON.parse(body)

    // Handle different event types
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object
        const _customerId = subscription.customer
        const plan = mapStripePlanToAppPlan(subscription.items.data[0]?.price.id)

        // Find user by Stripe customer ID (you'd need to store this in the User model)
        // For now, this is a placeholder
        await dbOperation(
          () =>
            db.user.updateMany({
              where: {
                // In production, add stripeCustomerId field to User model
                // stripeCustomerId: customerId,
              },
              data: { plan },
            }),
          undefined,
        )

        // Log audit event
        await logAuditEvent({
          action: "subscription_updated",
          resource: "billing",
          resourceId: subscription.id,
          details: { plan, customerId: subscription.customer },
        }).catch(console.error)

        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object
        const _customerId = subscription.customer

        // Downgrade to FREE plan
        await db.user.updateMany({
          where: {
            // stripeCustomerId: customerId,
          },
          data: { plan: "FREE" },
        })

        break
      }

      case "invoice.payment_succeeded": {
        // Handle successful payment
        console.log("Payment succeeded:", event.data.object.id)
        break
      }

      case "invoice.payment_failed": {
        // Handle failed payment
        console.log("Payment failed:", event.data.object.id)
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
 * Map Stripe price ID to app plan
 */
function mapStripePlanToAppPlan(priceId: string | undefined): Plan {
  if (!priceId) return "FREE"

  // In production, map your Stripe price IDs to plans
  const planMap: Record<string, Plan> = {
    price_starter: "STARTER",
    price_professional: "PROFESSIONAL",
    price_enterprise: "ENTERPRISE",
  }

  return planMap[priceId] || "FREE"
}
