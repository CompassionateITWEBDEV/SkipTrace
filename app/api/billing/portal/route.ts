import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createBillingPortalSession } from "@/lib/stripe"
import { createErrorResponse } from "@/lib/error-handler"

export const dynamic = "force-dynamic"

/**
 * Get a Stripe Customer Portal URL for the current user.
 * User must have a stripeCustomerId (have completed checkout at least once).
 */
export async function GET() {
  try {
    const user = await requireAuth()
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { stripeCustomerId: true },
    })
    if (!dbUser?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No subscription on file. Upgrade a plan first to manage billing." },
        { status: 400 },
      )
    }
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const { url } = await createBillingPortalSession(dbUser.stripeCustomerId, `${baseUrl}/account`)
    return NextResponse.json({ url })
  } catch (error) {
    console.error("Billing portal error:", error)
    return createErrorResponse(error, "Failed to create billing portal session")
  }
}
