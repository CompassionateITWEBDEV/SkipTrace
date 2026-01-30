// Notification system for monitoring alerts and system events

import { createHmac } from "crypto"
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
 * Send email notification via Resend when RESEND_API_KEY is set; otherwise log in dev.
 */
async function sendEmailNotification(data: NotificationData): Promise<void> {
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

  const from = process.env.NOTIFICATION_EMAIL_FROM || "SkipTrace <onboarding@resend.dev>"
  const html = generateEmailTemplate(data)

  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import("resend")
      const resend = new Resend(process.env.RESEND_API_KEY)
      const { error } = await resend.emails.send({
        from,
        to: user.email,
        subject: data.title,
        html,
      })
      if (error) {
        console.warn("Resend email failed:", error)
      }
    } catch (err) {
      console.warn("Failed to send email notification:", err)
    }
    return
  }

  console.log(`Email notification would be sent to ${user.email}:`, {
    subject: data.title,
    message: data.message,
  })
}

function generateEmailTemplate(data: NotificationData): string {
  const escapedTitle = escapeHtml(data.title)
  const escapedMessage = escapeHtml(data.message)
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${escapedTitle}</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="font-size: 1.25rem;">${escapedTitle}</h1>
  <p style="color: #374151;">${escapedMessage.replace(/\n/g, "<br>")}</p>
  <p style="color: #9ca3af; font-size: 0.875rem; margin-top: 24px;">SkipTrace Notification</p>
</body>
</html>
  `.trim()
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
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
  try {
    await sendWebhookNotification(userId, "monitoring.alert", {
      subscriptionId,
      targetType,
      targetValue,
      changes,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.warn("Failed to send monitoring webhook:", error)
  }
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
export async function sendWebhookNotification(
  userId: string,
  event: string,
  data: Record<string, unknown>,
): Promise<void> {
  const webhooks = await dbOperation(
    () =>
      db.webhook.findMany({
        where: {
          userId,
          active: true,
          events: { has: event },
        },
        select: { id: true, url: true, secret: true },
      }),
    [],
  )

  if (!Array.isArray(webhooks) || webhooks.length === 0) return

  const payload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  }
  const body = JSON.stringify(payload)

  await Promise.allSettled(
    webhooks.map(async (webhook) => {
      const signature = webhook.secret
        ? generateWebhookSignature(body, webhook.secret)
        : ""
      try {
        const res = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(signature ? { "X-Webhook-Signature": signature } : {}),
            "X-Webhook-Event": event,
          },
          body,
          signal: AbortSignal.timeout(10000),
        })
        if (!res.ok) {
          console.warn(`Webhook ${webhook.id} delivery failed: ${res.status} ${res.statusText}`)
        }
      } catch (err) {
        console.warn(`Webhook ${webhook.id} delivery error:`, err)
      }
    }),
  )
}

function generateWebhookSignature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex")
}
