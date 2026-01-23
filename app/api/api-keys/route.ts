import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { randomBytes } from "crypto"

// Force dynamic rendering to prevent build-time database calls
export const dynamic = "force-dynamic"

/**
 * Get all API keys for the current user
 */
export async function GET() {
  try {
    const user = await requireAuth()

    const apiKeys = await db.apiKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        key: true,
        createdAt: true,
        lastUsed: true,
        expiresAt: true,
      },
    })

    return NextResponse.json({ apiKeys })
  } catch (error) {
    console.error("Error fetching API keys:", error)
    return NextResponse.json({ error: "Failed to fetch API keys" }, { status: 500 })
  }
}

/**
 * Create a new API key
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const { name } = await request.json()

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "API key name is required" }, { status: 400 })
    }

    // Generate a secure API key
    const keyPrefix = "sk_"
    const keySuffix = randomBytes(32).toString("base64url")
    const apiKey = `${keyPrefix}${keySuffix}`

    const keyRecord = await db.apiKey.create({
      data: {
        userId: user.id,
        name: name.trim(),
        key: apiKey,
      },
      select: {
        id: true,
        name: true,
        key: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ apiKey: keyRecord }, { status: 201 })
  } catch (error) {
    console.error("Error creating API key:", error)
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 })
  }
}

/**
 * Delete an API key
 */
export async function DELETE(request: Request) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "API key ID is required" }, { status: 400 })
    }

    // Verify ownership
    const apiKey = await db.apiKey.findUnique({
      where: { id },
    })

    if (!apiKey || apiKey.userId !== user.id) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 })
    }

    await db.apiKey.delete({
      where: { id },
    })

    return NextResponse.json({ message: "API key deleted" })
  } catch (error) {
    console.error("Error deleting API key:", error)
    return NextResponse.json({ error: "Failed to delete API key" }, { status: 500 })
  }
}
