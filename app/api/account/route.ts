import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db, dbOperation } from "@/lib/db"
import { createErrorResponse } from "@/lib/error-handler"

// Force dynamic rendering
export const dynamic = "force-dynamic"

/**
 * Get current user account information
 */
export async function GET() {
  try {
    const user = await requireAuth()

    const userData = await dbOperation(
      () =>
        db.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            email: true,
            name: true,
            plan: true,
            emailVerified: true,
            createdAt: true,
            image: true,
          },
        }),
      null,
    )

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(userData)
  } catch (error) {
    console.error("Error fetching account:", error)
    return createErrorResponse(error, "Failed to fetch account information")
  }
}

/**
 * Update current user profile (name only; email is read-only).
 */
export async function PATCH(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json().catch(() => ({}))
    const { name } = body as { name?: string }

    const updated = await dbOperation(
      () =>
        db.user.update({
          where: { id: user.id },
          data: { name: name != null ? String(name).trim() || null : undefined },
          select: { id: true, email: true, name: true, plan: true },
        }),
      null,
    )

    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating account:", error)
    return createErrorResponse(error, "Failed to update profile")
  }
}
