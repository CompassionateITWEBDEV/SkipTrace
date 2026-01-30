import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createErrorResponse, ValidationError } from "@/lib/error-handler"

export const dynamic = "force-dynamic"

/**
 * Get all cases for the current user
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100)
    const offset = parseInt(searchParams.get("offset") || "0", 10)

    const where = { userId: user.id }
    if (status && ["OPEN", "IN_PROGRESS", "CLOSED"].includes(status)) {
      Object.assign(where, { status })
    }

    const [cases, total] = await Promise.all([
      db.case.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          reportIds: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.case.count({ where }),
    ])

    return NextResponse.json({
      cases,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    })
  } catch (error) {
    console.error("Error fetching cases:", error)
    return createErrorResponse(error, "Failed to fetch cases")
  }
}

/**
 * Create a new case
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { name, description, reportIds } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      throw new ValidationError("Case name is required")
    }

    const reportIdList = Array.isArray(reportIds)
      ? reportIds.filter((r: unknown) => typeof r === "string").slice(0, 500)
      : []

    const newCase = await db.case.create({
      data: {
        userId: user.id,
        name: name.trim(),
        description: typeof description === "string" ? description.trim() || null : null,
        reportIds: reportIdList,
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        reportIds: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(newCase, { status: 201 })
  } catch (error) {
    console.error("Error creating case:", error)
    return createErrorResponse(error, "Failed to create case")
  }
}
