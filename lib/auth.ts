// Auth utilities and type definitions

import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export interface SessionUser {
  id: string
  email: string
  name?: string
  plan: string
}

/**
 * Get the current session on the server
 */
export async function getSession() {
  return await getServerSession(authOptions)
}

/**
 * Get the current user from the session
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession()
  return (session?.user as SessionUser) || null
}

/**
 * Require authentication - throws if user is not authenticated
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Authentication required")
  }
  return user
}

/**
 * Check if user has admin privileges
 */
export async function isAdminUser(userId: string): Promise<boolean> {
  try {
    const { isAdmin } = await import("./rbac")
    return isAdmin(userId)
  } catch {
    return false
  }
}
