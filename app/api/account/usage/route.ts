import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getUserUsage } from "@/lib/rate-limit"

// Force dynamic rendering to prevent build-time database calls
export const dynamic = "force-dynamic"

/**
 * Get current user's usage statistics
 */
export async function GET() {
  try {
    const user = await requireAuth()
    const usage = await getUserUsage(user.id)

    return NextResponse.json(usage)
  } catch (error) {
    console.error("Error fetching usage:", error)
    return NextResponse.json({ error: "Failed to fetch usage statistics" }, { status: 500 })
  }
}
