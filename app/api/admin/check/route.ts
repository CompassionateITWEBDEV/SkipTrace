import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { isAdmin } from "@/lib/rbac"
import { createErrorResponse } from "@/lib/error-handler"

// Force dynamic rendering
export const dynamic = "force-dynamic"

/**
 * Check if current user is an admin
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ isAdmin: false }, { status: 401 })
    }

    const admin = await isAdmin(user.id)

    return NextResponse.json({ isAdmin: admin })
  } catch (error) {
    console.error("Error checking admin status:", error)
    return createErrorResponse(error, "Failed to check admin status")
  }
}
