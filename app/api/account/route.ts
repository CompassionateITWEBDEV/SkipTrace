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
