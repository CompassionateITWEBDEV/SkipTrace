import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db, dbOperation } from "@/lib/db"
import { createErrorResponse } from "@/lib/error-handler"

// Force dynamic rendering
export const dynamic = "force-dynamic"

// Type helper for notification model (Prisma client with notification delegate)
type NotificationModel = {
  notification: {
    findMany: (args: { where: unknown; orderBy: unknown; take: number }) => Promise<Array<{ id: string; userId: string; type: string; title: string; message: string; metadata: unknown; read: boolean; createdAt: Date }>>
    count: (args: { where: unknown }) => Promise<number>
    updateMany: (args: { where: unknown; data: unknown }) => Promise<{ count: number }>
    findUnique: (args: { where: { id: string } }) => Promise<{ userId: string } | null>
    delete: (args: { where: { id: string } }) => Promise<unknown>
    deleteMany: (args: { where: unknown }) => Promise<{ count: number }>
  }
}

const dbWithNotifications = db as unknown as NotificationModel

/**
 * GET - Fetch user notifications
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get("unreadOnly") === "true"
    const limit = parseInt(searchParams.get("limit") || "50")
    const type = searchParams.get("type")

    const where: { userId: string; read?: boolean; type?: string } = {
      userId: user.id,
    }

    if (unreadOnly) {
      where.read = false
    }

    if (type) {
      where.type = type
    }

    const notifications = await dbOperation(
      () =>
        dbWithNotifications.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
        }),
      [],
    )

    // Get unread count
    const unreadCount = await dbOperation(
      () =>
        dbWithNotifications.notification.count({
          where: {
            userId: user.id,
            read: false,
          },
        }),
      0,
    )

    return NextResponse.json({
      notifications,
      unreadCount,
    })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return createErrorResponse(error, "Failed to fetch notifications")
  }
}

/**
 * PATCH - Mark notifications as read
 */
export async function PATCH(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json().catch(() => ({}))
    const { notificationIds, markAllRead } = body

    if (markAllRead) {
      // Mark all user notifications as read
      await dbOperation(
        () =>
          dbWithNotifications.notification.updateMany({
            where: {
              userId: user.id,
              read: false,
            },
            data: {
              read: true,
            },
          }),
        undefined,
      )
    } else if (Array.isArray(notificationIds) && notificationIds.length > 0) {
      // Mark specific notifications as read
      await dbOperation(
        () =>
          dbWithNotifications.notification.updateMany({
            where: {
              id: { in: notificationIds },
              userId: user.id, // Ensure user owns these notifications
            },
            data: {
              read: true,
            },
          }),
        undefined,
      )
    } else {
      return NextResponse.json({ error: "notificationIds array or markAllRead required" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating notifications:", error)
    return createErrorResponse(error, "Failed to update notifications")
  }
}

/**
 * DELETE - Delete notifications
 */
export async function DELETE(request: Request) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const deleteAllRead = searchParams.get("deleteAllRead") === "true"

    if (deleteAllRead) {
      // Delete all read notifications for user
      await dbOperation(
        () =>
          dbWithNotifications.notification.deleteMany({
            where: {
              userId: user.id,
              read: true,
            },
          }),
        undefined,
      )
    } else if (id) {
      // Delete specific notification
      const notification = await dbOperation(
        () =>
          dbWithNotifications.notification.findUnique({
            where: { id },
          }),
        null,
      ) as { userId: string } | null

      if (!notification || notification.userId !== user.id) {
        return NextResponse.json({ error: "Notification not found" }, { status: 404 })
      }

      await dbOperation(
        () =>
          dbWithNotifications.notification.delete({
            where: { id },
          }),
        undefined,
      )
    } else {
      return NextResponse.json({ error: "id or deleteAllRead required" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting notifications:", error)
    return createErrorResponse(error, "Failed to delete notification")
  }
}
