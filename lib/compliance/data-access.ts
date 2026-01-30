// Compliance and data access control utilities
// Ensures proper authorization for accessing regulated data sources

import { db, dbOperation } from "../db"

export type DataSourceType = "public" | "credit_header" | "dmv" | "court_records" | "premium"

export interface ComplianceCheck {
  allowed: boolean
  reason?: string
  requiredVerification?: string[]
}

/**
 * Check if user can access a specific data source based on compliance requirements
 */
export async function checkDataAccess(
  userId: string,
  dataSource: DataSourceType,
): Promise<ComplianceCheck> {
  const userResult = await dbOperation(
    () =>
      db.user.findUnique({
        where: { id: userId },
        select: { plan: true, emailVerified: true },
      }),
    null,
  )

  if (!userResult) {
    return { allowed: false, reason: "User not found" }
  }

  // Type assertion: dbOperation + Prisma can infer 'never' after null check in some builds
  const user = userResult as { plan: string; emailVerified: boolean | null }

  // Public data sources - available to all authenticated users
  if (dataSource === "public") {
    return { allowed: true }
  }

  // Premium data sources require specific plans and verification
  if (dataSource === "credit_header" || dataSource === "dmv" || dataSource === "court_records") {
    // These require PROFESSIONAL or ENTERPRISE plan
    if (user.plan !== "PROFESSIONAL" && user.plan !== "ENTERPRISE") {
      return {
        allowed: false,
        reason: "Premium data sources require Professional or Enterprise plan",
        requiredVerification: ["email_verification", "plan_upgrade"],
      }
    }

    // May require additional verification in the future
    if (!user.emailVerified) {
      return {
        allowed: false,
        reason: "Email verification required for premium data access",
        requiredVerification: ["email_verification"],
      }
    }

    return { allowed: true }
  }

  // Premium category - requires ENTERPRISE
  if (dataSource === "premium") {
    if (user.plan !== "ENTERPRISE") {
      return {
        allowed: false,
        reason: "Premium data sources require Enterprise plan",
        requiredVerification: ["plan_upgrade"],
      }
    }

    return { allowed: true }
  }

  return { allowed: false, reason: "Unknown data source type" }
}

/**
 * Verify user has permissible purpose for regulated data access
 * In production, this would check user's declared purpose and credentials
 */
export async function verifyPermissiblePurpose(
  userId: string,
  _purpose: string,
): Promise<boolean> {
  // In production, validate against FCRA/GLBA requirements
  // For now, return true if user is authenticated
  const user = await dbOperation(
    () =>
      db.user.findUnique({
        where: { id: userId },
      }),
    null,
  )

  return user !== null
}

/**
 * Log data access for compliance auditing
 */
export async function logDataAccess(
  userId: string,
  dataSource: DataSourceType,
  query: string,
  purpose?: string,
): Promise<void> {
  // In production, store in audit log table
  console.log("Data access logged:", {
    userId,
    dataSource,
    query,
    purpose,
    timestamp: new Date().toISOString(),
  })
}
