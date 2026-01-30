import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { requireAdmin } from "@/lib/rbac"
import { db } from "@/lib/db"
import { createErrorResponse } from "@/lib/error-handler"

export const dynamic = "force-dynamic"

/**
 * GET - List users (paginated). Admin only.
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    await requireAdmin(user.id)

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100)
    const offset = parseInt(searchParams.get("offset") || "0", 10)

    const [users, total] = await Promise.all([
      db.user.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          role: true,
          createdAt: true,
        },
      }),
      db.user.count(),
    ])

    return NextResponse.json({
      users,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    })
  } catch (error) {
    console.error("Admin users list error:", error)
    return createErrorResponse(error, "Failed to list users")
  }
}
