import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import type { Prisma } from "@prisma/client"

// Force dynamic rendering to prevent build-time database calls
export const dynamic = "force-dynamic"

/**
 * Get all reports for the current user
 */
export async function GET(request: Request) {
  try {
    let user
    try {
      user = await requireAuth()
    } catch {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    const [reports, total] = await Promise.all([
      db.report.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          title: true,
          searchType: true,
          createdAt: true,
          updatedAt: true,
          shared: true,
          query: true,
          // Note: results is intentionally excluded from list view to reduce payload size
          // It will be fetched when needed (e.g., for export or detail view)
        },
      }),
      db.report.count({ where: { userId: user.id } }),
    ])

    return NextResponse.json({
      reports,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error("Error fetching reports:", error)
    const message = error instanceof Error ? error.message : String(error)

    // Enhanced error handling
    if (error && typeof error === "object" && "code" in error) {
      const prismaError = error as { code?: string; message?: string }
      if (prismaError.code === "P1011" || prismaError.code === "P1001") {
        return NextResponse.json(
          {
            error: "Database connection failed",
            details: process.env.NODE_ENV === "development" ? prismaError.message : undefined,
          },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      {
        error: "Failed to fetch reports",
        details: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 }
    )
  }
}


/**
 * Create a new report
 */
export async function POST(request: Request) {
  try {
    let user
    try {
      user = await requireAuth()
    } catch {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }
    const { title, query, results, searchType } = await request.json()

    if (!title || !query || !results) {
      return NextResponse.json({ error: "Title, query, and results are required" }, { status: 400 })
    }

    const report = await db.report.create({
      data: {
        userId: user.id,
        title,
        query: JSON.stringify(query),
        results: results as Prisma.InputJsonValue,
        searchType: searchType || "COMPREHENSIVE",
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ report }, { status: 201 })
  } catch (error) {
    console.error("Error creating report:", error)
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 })
  }
}
