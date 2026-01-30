import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db, dbOperation } from "@/lib/db"
import { createErrorResponse, ValidationError } from "@/lib/error-handler"
import { logAuditEvent } from "@/lib/audit-log"

type Plan = "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE"

// Force dynamic rendering
export const dynamic = "force-dynamic"

/**
 * Create Stripe checkout session for plan upgrade
 * In production, integrate with Stripe Checkout API
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json().catch(() => ({}))
    const { plan } = body

    if (!plan || !["STARTER", "PROFESSIONAL", "ENTERPRISE"].includes(plan)) {
      throw new ValidationError("Valid plan is required (STARTER, PROFESSIONAL, or ENTERPRISE)")
    }

    // Check if user already has this plan or higher
    const currentUserResult = await dbOperation(
      () =>
        db.user.findUnique({
          where: { id: user.id },
          select: { plan: true },
        }),
      null,
    )

    if (!currentUserResult) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Type assertion: dbOperation + Prisma can infer 'never' after null check in some builds
    const currentUser = currentUserResult as { plan: Plan }

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

    // In production, create Stripe Checkout Session
    // For now, return a mock checkout URL
    const checkoutUrl = `/billing/checkout?plan=${plan}&session_id=mock_${Date.now()}`

    // Log audit event
    await logAuditEvent({
      userId: user.id,
      action: "checkout_initiated",
      resource: "billing",
      resourceId: plan,
      details: { fromPlan: currentUser.plan, toPlan: plan },
    }).catch(console.error)

    return NextResponse.json({
      checkoutUrl,
      plan,
      message: "Checkout session created. In production, this would redirect to Stripe Checkout.",
    })
  } catch (error) {
    console.error("Checkout creation error:", error)
    return createErrorResponse(error, "Failed to create checkout session")
  }
}
