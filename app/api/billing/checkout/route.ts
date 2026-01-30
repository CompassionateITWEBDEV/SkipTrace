import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db, dbOperation } from "@/lib/db"
import { createErrorResponse, ValidationError } from "@/lib/error-handler"
import { logAuditEvent } from "@/lib/audit-log"
import { createCheckoutSession, stripe } from "@/lib/stripe"

type Plan = "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE"

// Force dynamic rendering
export const dynamic = "force-dynamic"

/**
 * Create Stripe checkout session for plan upgrade.
 * Saves stripeCustomerId when user completes checkout (via webhook checkout.session.completed).
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json().catch(() => ({}))
    const { plan } = body

    if (!plan || !["STARTER", "PROFESSIONAL", "ENTERPRISE"].includes(plan)) {
      throw new ValidationError("Valid plan is required (STARTER, PROFESSIONAL, or ENTERPRISE)")
    }

    const currentUserResult = await dbOperation(
      () =>
        db.user.findUnique({
          where: { id: user.id },
          select: { plan: true, email: true, stripeCustomerId: true },
        }),
      null,
    )

    if (!currentUserResult) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const currentUser = currentUserResult as {
      plan: Plan
      email: string
      stripeCustomerId: string | null
    }

    const planHierarchy: Record<Plan, number> = {
      FREE: 0,
      STARTER: 1,
      PROFESSIONAL: 2,
      ENTERPRISE: 3,
    }

    if (planHierarchy[currentUser.plan] >= planHierarchy[plan as Plan]) {
      return NextResponse.json(
        {
          error: `You already have ${currentUser.plan} plan or higher`,
          currentPlan: currentUser.plan,
        },
        { status: 400 },
      )
    }

    let checkoutUrl: string
    let sessionId: string

    if (stripe) {
      const session = await createCheckoutSession(
        user.id,
        currentUser.email,
        plan as "STARTER" | "PROFESSIONAL" | "ENTERPRISE",
        currentUser.stripeCustomerId,
      )
      checkoutUrl = session.url
      sessionId = session.sessionId
    } else {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      checkoutUrl = `${baseUrl}/billing?plan=${plan}&session_id=mock_${Date.now()}`
      sessionId = `cs_mock_${Date.now()}`
    }

    await logAuditEvent({
      userId: user.id,
      action: "checkout_initiated",
      resource: "billing",
      resourceId: plan,
      details: { fromPlan: currentUser.plan, toPlan: plan },
    }).catch(console.error)

    return NextResponse.json({
      checkoutUrl,
      sessionId,
      plan,
    })
  } catch (error) {
    console.error("Checkout creation error:", error)
    return createErrorResponse(error, "Failed to create checkout session")
  }
}
