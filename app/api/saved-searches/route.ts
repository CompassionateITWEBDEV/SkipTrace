import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import type { Prisma } from "@prisma/client"

// Force dynamic rendering to prevent build-time database calls
export const dynamic = "force-dynamic"

/**
 * Get all saved searches for the current user
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    const [searches, total] = await Promise.all([
      db.savedSearch.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      db.savedSearch.count({ where: { userId: user.id } }),
    ])

    return NextResponse.json({
      searches,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error("Error fetching saved searches:", error)
    return NextResponse.json({ error: "Failed to fetch saved searches" }, { status: 500 })
  }
}

/**
 * Create a new saved search
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const { name, query, results } = await request.json()

    if (!name || !query) {
      return NextResponse.json({ error: "Name and query are required" }, { status: 400 })
    }

    const search = await db.savedSearch.create({
      data: {
        userId: user.id,
        name: name.trim(),
        query: JSON.stringify(query),
        results: results ? (results as Prisma.InputJsonValue) : undefined,
      },
    })

    return NextResponse.json({ search }, { status: 201 })
  } catch (error) {
    console.error("Error creating saved search:", error)
    return NextResponse.json({ error: "Failed to create saved search" }, { status: 500 })
  }
}

/**
 * Delete a saved search
 */
export async function DELETE(request: Request) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Search ID is required" }, { status: 400 })
    }

    // Verify ownership
    const search = await db.savedSearch.findUnique({
      where: { id },
    })

    if (!search || search.userId !== user.id) {
      return NextResponse.json({ error: "Saved search not found" }, { status: 404 })
    }

    await db.savedSearch.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Saved search deleted" })
  } catch (error) {
    console.error("Error deleting saved search:", error)
    return NextResponse.json({ error: "Failed to delete saved search" }, { status: 500 })
  }
}
