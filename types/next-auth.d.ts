// Extend NextAuth types to include custom user properties

import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      plan: string
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    plan: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    plan: string
  }
}
