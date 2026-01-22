import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const response = await fetch(
      `https://email-social-media-checker.p.rapidapi.com/check_email?email=${encodeURIComponent(email)}`,
      {
        method: "GET",
        headers: {
          "x-rapidapi-host": "email-social-media-checker.p.rapidapi.com",
          "x-rapidapi-key": "9a54072d5cmsh961d1d5cc06d163p169947jsn2a30428d73df",
        },
      },
    )

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Email social media check failed:", error)
    return NextResponse.json({ error: "Failed to check email on social platforms" }, { status: 500 })
  }
}
