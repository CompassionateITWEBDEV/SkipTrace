import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hash } from "bcryptjs"
import { z } from "zod"

// Force dynamic rendering to prevent build-time database calls
export const dynamic = "force-dynamic"

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, name } = signupSchema.parse(body)

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 })
    }

    // Hash password
    const passwordHash = await hash(password, 12)

    // Create user
    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        name: name || null,
        plan: "FREE",
      },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        createdAt: true,
      },
    })

    return NextResponse.json(
      {
        message: "User created successfully",
        user,
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }

    // Enhanced error logging for debugging
    console.error("Signup error:", error)
    
    // Check if it's a Prisma/database error
    if (error && typeof error === "object" && "code" in error) {
      const prismaError = error as { code?: string; message?: string }
      if (prismaError.code === "P1011" || prismaError.code === "P1001") {
        console.error("Database connection error:", prismaError.message)
        return NextResponse.json(
          { 
            error: "Database connection failed. Please check your database configuration.",
            details: process.env.NODE_ENV === "development" ? prismaError.message : undefined
          },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      { 
        error: "Failed to create user",
        details: process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
