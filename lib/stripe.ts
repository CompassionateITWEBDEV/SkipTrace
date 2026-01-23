// Stripe integration utilities
// In production, install and configure: npm install stripe

/**
 * Initialize Stripe client
 * In production, uncomment and configure:
 */
// import Stripe from "stripe"
// export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: "2024-12-18.acacia",
// })

/**
 * Create a checkout session for plan upgrade
 */
export async function createCheckoutSession(
  userId: string,
  plan: "STARTER" | "PROFESSIONAL" | "ENTERPRISE",
  _customerId?: string, // Reserved for future Stripe integration
): Promise<{ sessionId: string; url: string }> {
  // In production, implement actual Stripe checkout:
  /*
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: getPriceIdForPlan(plan),
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/billing`,
    metadata: {
      userId,
      plan,
    },
  })

  return {
    sessionId: session.id,
    url: session.url!,
  }
  */

  // Mock implementation for now
  return {
    sessionId: `cs_mock_${Date.now()}`,
    url: `/billing/checkout?plan=${plan}`,
  }
}

/**
 * Get Stripe price ID for a plan
 */
export function getPriceIdForPlan(plan: "STARTER" | "PROFESSIONAL" | "ENTERPRISE"): string {
  const priceMap: Record<string, string> = {
    STARTER: process.env.STRIPE_PRICE_STARTER || "price_starter",
    PROFESSIONAL: process.env.STRIPE_PRICE_PROFESSIONAL || "price_professional",
    ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE || "price_enterprise",
  }

  return priceMap[plan] || ""
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  _secret: string, // Reserved for future Stripe integration
): boolean {
  // In production, use Stripe's webhook signature verification:
  /*
  try {
    stripe.webhooks.constructEvent(payload, signature, secret)
    return true
  } catch (error) {
    return false
  }
  */

  // Mock implementation
  return signature.length > 0
}

/**
 * Get subscription details from Stripe
 */
export async function getSubscriptionDetails(_subscriptionId: string): Promise<{
  status: string
  plan: string
  currentPeriodEnd: number
}> {
  // In production, fetch from Stripe:
  /*
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  return {
    status: subscription.status,
    plan: subscription.items.data[0]?.price.id || "",
    currentPeriodEnd: subscription.current_period_end,
  }
  */

  // Mock implementation
  return {
    status: "active",
    plan: "STARTER",
    currentPeriodEnd: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days from now
  }
}
