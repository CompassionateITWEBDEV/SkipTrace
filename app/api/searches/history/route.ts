import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import type { SearchType } from "@prisma/client"

// Force dynamic rendering to prevent build-time database calls
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")
    const searchType = searchParams.get("type") as SearchType | null

    const where: { userId: string; searchType?: SearchType } = {
      userId: user.id,
    }

    if (searchType) {
      where.searchType = searchType
    }

    const [logs, total] = await Promise.all([
      db.searchLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take: limit,
        skip: offset,
      }),
      db.searchLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error("Error fetching search history:", error)
    return NextResponse.json({ error: "Failed to fetch search history" }, { status: 500 })
  }
}
