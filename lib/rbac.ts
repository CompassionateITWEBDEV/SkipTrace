// Role-Based Access Control (RBAC) utilities
// Admin is determined by the user.role field in the database (ADMIN vs USER).

import { db, dbOperation } from "./db"

export type UserRole = "USER" | "ADMIN" | "MODERATOR"

/**
 * Check if user has a specific role (from database user.role field).
 */
export async function hasRole(userId: string, role: UserRole): Promise<boolean> {
  try {
    const user = await dbOperation(
      () =>
        db.user.findUnique({
          where: { id: userId },
          select: { role: true },
        }),
      null,
    )

    if (!user) return false

    if (role === "ADMIN") {
      return user.role === "ADMIN"
    }

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
