import NextAuth, { type NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import type { User } from "next-auth"
import { db } from "@/lib/db"
import { compare } from "bcryptjs"
import { getClientIdentifier, checkAuthRateLimit } from "@/lib/auth-rate-limit"

// Force dynamic rendering to prevent build-time database calls
export const dynamic = "force-dynamic"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.passwordHash) {
          return null
        }

        const isValid = await compare(credentials.password, user.passwordHash)

        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
          plan: user.plan,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.plan = (user as User & { plan?: string }).plan
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string
        session.user.plan = token.plan as string
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

async function withAuthRateLimit(
  req: Request,
  handlerFn: (req: Request) => Promise<Response>,
): Promise<Response> {
  if (req.method !== "POST") {
    return handlerFn(req)
  }
  const identifier = getClientIdentifier(req)
  const { allowed } = await checkAuthRateLimit(identifier)
  if (!allowed) {
    return new Response(
      JSON.stringify({
        error: "Too many sign-in attempts. Please try again in 15 minutes.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": "0",
        },
      },
    )
  }
  return handlerFn(req)
}

export async function GET(req: Request, context: unknown) {
  return handler(req as never, context as never)
}

export async function POST(req: Request, context: unknown) {
  return withAuthRateLimit(req, (r) => handler(r as never, context as never))
}
