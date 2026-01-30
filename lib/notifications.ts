// Notification system for monitoring alerts and system events

import { db, dbOperation } from "./db"

// Type helper for notification model
type NotificationModel = {
  notification: {
    create: (args: { data: { userId: string; type: string; title: string; message: string; metadata: unknown; read: boolean } }) => Promise<unknown>
  }
}

const dbWithNotifications = db as unknown as NotificationModel

export interface NotificationData {
  userId: string
  type: "monitoring_alert" | "batch_complete" | "system"
  title: string
  message: string
  metadata?: Record<string, unknown>
  read?: boolean
}

/**
 * Send a notification to a user
 * Stores in database and optionally sends email
 */
export async function sendNotification(data: NotificationData): Promise<void> {
  try {
    // Store notification in database
    await dbOperation(
      () =>
        dbWithNotifications.notification.create({
          data: {
            userId: data.userId,
            type: data.type,
            title: data.title,
            message: data.message,
            metadata: data.metadata || {},
            read: data.read || false,
          },
        }),
      undefined,
    )

    // Send email notification if it's a monitoring alert or batch complete
    if (data.type === "monitoring_alert" || data.type === "batch_complete") {
      try {
        await sendEmailNotification(data)
      } catch (emailError) {
        // Don't fail notification if email fails
        console.warn("Failed to send email notification:", emailError)
      }
    }

    console.log(`Notification sent for user ${data.userId}:`, {
      type: data.type,
      title: data.title,
    })
  } catch (error) {
    console.error("Failed to send notification:", error)
    // Don't throw - notifications are non-critical
  }
}

/**
 * Send email notification
 * In production, integrate with email service like SendGrid, Resend, or AWS SES
 */
async function sendEmailNotification(data: NotificationData): Promise<void> {
  // Get user email
  const user = await dbOperation(
    () =>
      db.user.findUnique({
        where: { id: data.userId },
        select: { email: true, name: true },
      }),
    null,
  )

  if (!user || !user.email) {
    console.warn(`Cannot send email notification: user ${data.userId} not found or has no email`)
    return
  }

  // In production, use an email service
  // For now, we'll just log the email that would be sent
  // Example with a service like Resend:
  // await resend.emails.send({
  //   from: 'SkipTrace <notifications@skiptrace.com>',
  //   to: user.email,
  //   subject: data.title,
  //   html: generateEmailTemplate(data),
  // })

  console.log(`Email notification would be sent to ${user.email}:`, {
    subject: data.title,
    message: data.message,
  })

  // TODO: Integrate with actual email service (SendGrid, Resend, AWS SES, etc.)
  // Check user preferences for email notifications
  // Format email with proper HTML template
}

/**
 * Send monitoring alert notification
 */
export async function sendMonitoringAlert(
  userId: string,
  subscriptionId: string,
  targetType: string,
  targetValue: string,
  changes: string[],
): Promise<void> {
  await sendNotification({
    userId,
    type: "monitoring_alert",
    title: `Monitoring Alert: Changes Detected`,
    message: `Changes detected for ${targetType} ${targetValue}: ${changes.join(", ")}`,
    metadata: {
      subscriptionId,
      targetType,
      targetValue,
      changes,
    },
  })
}

/**
 * Send batch job completion notification
 */
export async function sendBatchCompleteNotification(
  userId: string,
  jobId: string,
  summary: { total: number; success: number; errors: number },
): Promise<void> {
  await sendNotification({
    userId,
    type: "batch_complete",
    title: `Batch Job Completed`,
    message: `Batch job ${jobId} completed: ${summary.success}/${summary.total} successful`,
    metadata: {
      jobId,
      summary,
    },
  })

  // Send webhook notification if configured
  try {
    await sendWebhookNotification(userId, "batch.completed", {
      jobId,
      summary,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.warn("Failed to send webhook notification:", error)
    // Don't fail the notification if webhook fails
  }
}

/**
 * Send webhook notification to user's configured webhooks
 */
async function sendWebhookNotification(
  _userId: string,
  _event: string,
  _data: Record<string, unknown>,
): Promise<void> {
  // In production, fetch webhook configurations from database
  // For now, this is a placeholder
  // Example implementation:
  // const webhooks = await db.webhook.findMany({ where: { userId, active: true, events: { has: event } } })
  // for (const webhook of webhooks) {
  //   await fetch(webhook.url, {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json", "X-Webhook-Signature": generateSignature(data, webhook.secret) },
  //     body: JSON.stringify({ event, timestamp: new Date().toISOString(), data }),
  //   })
  // }
}
