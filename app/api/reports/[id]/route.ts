import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"

// Force dynamic rendering to prevent build-time database calls
export const dynamic = "force-dynamic"

/**
 * Get a specific report by ID
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const report = await db.report.findUnique({
      where: { id },
    })

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    // Verify ownership
    if (report.userId !== user.id && !report.shared) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json({ report })
  } catch (error) {
    console.error("Error fetching report:", error)
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 })
  }
}

/**
 * Update a report
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()

    // Verify ownership
    const existing = await db.report.findUnique({
      where: { id },
    })

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    // Generate shared token if sharing is enabled
    let sharedToken = existing.sharedToken
    if (body.shared && !sharedToken) {
      // Generate a secure random token
      sharedToken = `${id}-${Buffer.from(`${Date.now()}-${Math.random()}`).toString("base64url").substring(0, 16)}`
    } else if (!body.shared && sharedToken) {
      // Remove token if sharing is disabled
      sharedToken = null
    }

    const report = await db.report.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.shared !== undefined && { shared: body.shared }),
        ...(sharedToken !== undefined && { sharedToken }),
        ...(body.results && { results: body.results as unknown }),
      },
    })

    return NextResponse.json({ 
      report: {
        ...report,
        ...(sharedToken && { shareUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/reports/shared/${sharedToken}` }),
      },
    })
  } catch (error) {
    console.error("Error updating report:", error)
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 })
  }
}

/**
 * Delete a report
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params

    // Verify ownership
    const existing = await db.report.findUnique({
      where: { id },
    })

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    await db.report.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Report deleted" })
  } catch (error) {
    console.error("Error deleting report:", error)
    return NextResponse.json({ error: "Failed to delete report" }, { status: 500 })
  }
}
