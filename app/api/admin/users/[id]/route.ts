import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { requireAdmin } from "@/lib/rbac"
import { db } from "@/lib/db"
import { logAdminAction } from "@/lib/audit-log"
import { createErrorResponse } from "@/lib/error-handler"

export const dynamic = "force-dynamic"

type Plan = "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE"
const VALID_PLANS: Plan[] = ["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"]

/**
 * PATCH - Update a user (e.g. plan). Admin only.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    await requireAdmin(user.id)

    const { id } = await context.params
    const body = await request.json().catch(() => ({}))
    const { plan } = body as { plan?: string }

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const data: { plan?: Plan } = {}
    if (plan && VALID_PLANS.includes(plan as Plan)) {
      data.plan = plan as Plan
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(existing)
    }

    const updated = await db.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        role: true,
        updatedAt: true,
      },
    })

    await logAdminAction(user.id, "plan_update", "user", id, {
      previousPlan: existing.plan,
      newPlan: updated.plan,
      targetEmail: existing.email,
    }).catch(() => {})

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Admin user update error:", error)
    return createErrorResponse(error, "Failed to update user")
  }
}
