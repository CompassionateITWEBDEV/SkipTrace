// Stripe integration utilities

import Stripe from "stripe"

const secretKey = process.env.STRIPE_SECRET_KEY
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export const stripe: Stripe | null = secretKey
  ? new Stripe(secretKey, { apiVersion: "2026-01-28.clover" })
  : null

/**
 * Create a checkout session for plan upgrade.
 * Creates or reuses Stripe customer and saves stripeCustomerId on the user.
 */
export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  plan: "STARTER" | "PROFESSIONAL" | "ENTERPRISE",
  existingStripeCustomerId?: string | null,
): Promise<{ sessionId: string; url: string }> {
  if (!stripe) {
    throw new Error("Stripe is not configured (STRIPE_SECRET_KEY missing)")
  }

  const priceId = getPriceIdForPlan(plan)
  if (!priceId) {
    throw new Error(`No Stripe price ID configured for plan: ${plan}`)
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/pricing`,
    metadata: { userId, plan },
    subscription_data: { metadata: { userId, plan } },
  }

  if (existingStripeCustomerId) {
    sessionParams.customer = existingStripeCustomerId
  } else {
    sessionParams.customer_email = userEmail
  }

  const session = await stripe.checkout.sessions.create(sessionParams)

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL")
  }

  return {
    sessionId: session.id,
    url: session.url,
  }
}

/**
 * Get Stripe price ID for a plan (from env or default placeholder IDs).
 */
export function getPriceIdForPlan(plan: "STARTER" | "PROFESSIONAL" | "ENTERPRISE"): string | null {
  const priceMap: Record<string, string | undefined> = {
    STARTER: process.env.STRIPE_PRICE_STARTER,
    PROFESSIONAL: process.env.STRIPE_PRICE_PROFESSIONAL,
    ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE,
  }
  return priceMap[plan] ?? null
}

/**
 * Verify Stripe webhook signature and return the event, or throw.
 */
export function verifyWebhookSignature(payload: string, signature: string): Stripe.Event {
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set")
  }
  return stripe!.webhooks.constructEvent(payload, signature, webhookSecret)
}

/**
 * Create a Stripe Customer Portal session for managing subscription and payment methods.
 * Returns the portal URL to redirect the user to.
 */
export async function createBillingPortalSession(
  stripeCustomerId: string,
  returnUrl: string,
): Promise<{ url: string }> {
  if (!stripe) {
    throw new Error("Stripe is not configured (STRIPE_SECRET_KEY missing)")
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  })
  if (!session.url) {
    throw new Error("Stripe did not return a portal URL")
  }
  return { url: session.url }
}

/**
 * Get subscription details from Stripe (for billing page).
 */
export async function getSubscriptionDetails(subscriptionId: string): Promise<{
  status: string
  plan: string
  currentPeriodEnd: number
}> {
  if (!stripe) {
    return {
      status: "active",
      plan: "FREE",
      currentPeriodEnd: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    }
  }
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const sub = subscription as unknown as { status: string; items: { data: Array<{ price?: { id?: string } }> }; current_period_end?: number }
  const priceId = sub.items?.data?.[0]?.price?.id ?? ""
  return {
    status: sub.status,
    plan: priceId,
    currentPeriodEnd: sub.current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
  }
}
