// Audit logging for compliance and security

import { db, dbOperation } from "./db"

export interface AuditLogEntry {
  userId?: string
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

/**
 * Log an audit event
 * In production, this should write to a separate audit log table or service
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    // For now, we'll use the SearchLog table for audit logging
    // In production, create a dedicated AuditLog table
    await dbOperation(
      () =>
        db.searchLog.create({
          data: {
            userId: entry.userId || null,
            searchType: "COMPREHENSIVE", // Use as a catch-all for audit events
            query: JSON.stringify({
              action: entry.action,
              resource: entry.resource,
              resourceId: entry.resourceId,
              details: entry.details,
              ipAddress: entry.ipAddress,
              userAgent: entry.userAgent,
            }),
            resultsCount: 0,
            success: true,
            timestamp: new Date(),
          },
        }),
      undefined,
    )
  } catch (error) {
    // Don't throw - audit logging failures shouldn't break the application
    console.error("Failed to log audit event:", error)
  }
}

/**
 * Log a search action
 */
export async function logSearchAction(
  userId: string | undefined,
  action: string,
  query: unknown,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  await logAuditEvent({
    userId,
    action,
    resource: "search",
    details: { query },
    ipAddress,
    userAgent,
  })
}

/**
 * Log a data access action
 */
export async function logDataAccess(
  userId: string,
  resource: string,
  resourceId: string,
  ipAddress?: string,
): Promise<void> {
  await logAuditEvent({
    userId,
    action: "access",
    resource,
    resourceId,
    ipAddress,
  })
}

/**
 * Log a data deletion action (for GDPR/CCPA compliance)
 */
export async function logDataDeletion(
  userId: string,
  resource: string,
  resourceId: string,
  reason: string,
): Promise<void> {
  await logAuditEvent({
    userId,
    action: "delete",
    resource,
    resourceId,
    details: { reason },
  })
}
