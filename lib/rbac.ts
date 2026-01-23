// Role-Based Access Control (RBAC) utilities
// Note: User model should include a 'role' field (USER, ADMIN, etc.)
// For now, we'll use plan-based access with admin check via email or environment variable

import { db, dbOperation } from "./db"

export type UserRole = "USER" | "ADMIN" | "MODERATOR"

// Admin emails (in production, store in database or environment)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").filter(Boolean)

/**
 * Check if user has a specific role
 * In production, this would check the user.role field from database
 */
export async function hasRole(userId: string, role: UserRole): Promise<boolean> {
  try {
    const user = await dbOperation(
      () =>
        db.user.findUnique({
          where: { id: userId },
          select: { email: true, plan: true },
        }),
      null,
    )

    if (!user) return false

    // Admin check - use email list or plan-based for now
    if (role === "ADMIN") {
      return ADMIN_EMAILS.includes(user.email) || user.plan === "ENTERPRISE"
    }

    // All authenticated users have USER role
    if (role === "USER") {
      return true
    }

    return false
  } catch (error) {
    console.error("Error checking user role:", error)
    return false
  }
}

/**
 * Check if user is an admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  return hasRole(userId, "ADMIN")
}

/**
 * Require admin access - throws if user is not admin
 */
export async function requireAdmin(userId: string): Promise<void> {
  const admin = await isAdmin(userId)
  if (!admin) {
    throw new Error("Admin access required")
  }
}

/**
 * Get user permissions based on role and plan
 */
export async function getUserPermissions(userId: string): Promise<{
  canViewAllReports: boolean
  canManageUsers: boolean
  canViewAnalytics: boolean
  canManageSystem: boolean
  canExportData: boolean
  canUseBatchSearch: boolean
  canUseMonitoring: boolean
}> {
  const admin = await isAdmin(userId)
  const user = await dbOperation(
    () =>
      db.user.findUnique({
        where: { id: userId },
        select: { plan: true },
      }),
    null,
  )

  const plan = user?.plan || "FREE"

  return {
    canViewAllReports: admin, // Admins can view all users' reports
    canManageUsers: admin,
    canViewAnalytics: true, // All users can view their own analytics
    canManageSystem: admin,
    canExportData: true, // All users can export
    canUseBatchSearch: plan !== "FREE", // Batch search requires paid plan
    canUseMonitoring: plan === "PROFESSIONAL" || plan === "ENTERPRISE" || admin,
  }
}

/**
 * Check if user can access a resource
 */
export async function canAccessResource(
  userId: string,
  resourceUserId: string | null | undefined,
  _resourceType: "report" | "search" | "batch" | "monitoring",
): Promise<boolean> {
  // User can always access their own resources
  if (resourceUserId === userId) {
    return true
  }

  // Admins can access all resources
  const admin = await isAdmin(userId)
  if (admin) {
    return true
  }

  // Otherwise, no access
  return false
}
