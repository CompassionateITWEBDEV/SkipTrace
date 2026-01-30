import { NextResponse } from "next/server"
import type { CaseStatus } from "@prisma/client"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createErrorResponse } from "@/lib/error-handler"

export const dynamic = "force-dynamic"

/**
 * Get a single case
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const caseRecord = await db.case.findFirst({
      where: { id, userId: user.id },
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

    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 })
    }

    return NextResponse.json(caseRecord)
  } catch (error) {
    console.error("Error fetching case:", error)
    return createErrorResponse(error, "Failed to fetch case")
  }
}

/**
 * Update a case
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const { name, description, status, reportIds } = body

    const existing = await db.case.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 })
    }

    const data: { name?: string; description?: string | null; status?: CaseStatus; reportIds?: string[] } = {}
    if (typeof name === "string" && name.trim().length > 0) data.name = name.trim()
    if (description !== undefined) data.description = typeof description === "string" ? description.trim() || null : null
    if (status && ["OPEN", "IN_PROGRESS", "CLOSED"].includes(status)) data.status = status as CaseStatus
    if (Array.isArray(reportIds)) data.reportIds = reportIds.filter((r: unknown) => typeof r === "string").slice(0, 500)

    const updated = await db.case.update({
      where: { id },
      data,
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

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating case:", error)
    return createErrorResponse(error, "Failed to update case")
  }
}

/**
 * Delete a case
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const existing = await db.case.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 })
    }

    await db.case.delete({ where: { id } })
    return NextResponse.json({ message: "Case deleted" })
  } catch (error) {
    console.error("Error deleting case:", error)
    return createErrorResponse(error, "Failed to delete case")
  }
}
