import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { createErrorResponse } from "@/lib/error-handler"

// Force dynamic rendering to prevent build-time issues
export const dynamic = "force-dynamic"

/**
 * Relationship Monitoring API
 * 
 * This endpoint provides information about professional monitoring services
 * and allows creating monitoring subscriptions.
 */
export async function GET(_request: NextRequest) {
  try {
    // Return structured monitoring service information
    // This matches the UI expectation of monitoringData.services array
    const services = [
      {
        name: "Email Monitoring",
        description:
          "Continuously monitor email addresses for new social media account registrations, data breaches, and public record updates.",
        status: "available",
        targetType: "email",
      },
      {
        name: "Phone Number Monitoring",
        description:
          "Track phone number changes, carrier updates, and virtual number detection alerts.",
        status: "available",
        targetType: "phone",
      },
      {
        name: "Name Monitoring",
        description:
          "Monitor for changes in address, contact information, and public records for individuals.",
        status: "available",
        targetType: "name",
      },
      {
        name: "Social Media Presence Tracking",
        description:
          "Monitor for new social media account creations and profile updates across 48+ platforms.",
        status: "available",
        targetType: "email", // Social media monitoring uses email
      },
      {
        name: "Comprehensive Person Monitoring",
        description:
          "Full-service monitoring combining all data sources with weekly automated reports.",
        status: "enterprise",
        targetType: "comprehensive",
      },
    ]

    return NextResponse.json({
      success: true,
      services,
      disclaimer:
        "This service is for legal and ethical use only with proper consent and authorization. Unauthorized surveillance is illegal. Users must have permissible purpose under applicable laws (e.g., FCRA, GLBA).",
    })
  } catch (error) {
    console.error("Relationship monitoring error:", error)
    return NextResponse.json({ error: "An error occurred while fetching monitoring data" }, { status: 500 })
  }
}

/**
 * POST handler for relationship monitoring requests
 * Accepts consent and can create monitoring subscriptions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { consent, targetType, targetValue, frequency } = body

    // Verify consent was provided
    if (!consent) {
      return NextResponse.json(
        { error: "Consent is required to access monitoring services" },
        { status: 400 }
      )
    }

    // If targetType and targetValue are provided, create a subscription
    if (targetType && targetValue) {
      try {
        await requireAuth()
        
        // Forward to monitoring API to create subscription
        const monitoringResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/monitoring`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: request.headers.get("cookie") || "",
            },
            body: JSON.stringify({
              targetType,
              targetValue,
              frequency: frequency || "weekly",
            }),
          }
        )

        if (monitoringResponse.ok) {
          const subscription = await monitoringResponse.json()
          return NextResponse.json({
            success: true,
            subscription: subscription.subscription,
            message: "Monitoring subscription created successfully",
          })
        } else {
          const errorData = await monitoringResponse.json().catch(() => ({}))
          return NextResponse.json(
            { error: errorData.error || "Failed to create monitoring subscription" },
            { status: monitoringResponse.status }
          )
        }
      } catch (authError) {
        // User not authenticated - return services info instead
        console.warn("User not authenticated for subscription creation:", authError)
      }
    }

    // Return monitoring service information
    const services = [
      {
        name: "Email Monitoring",
        description:
          "Continuously monitor email addresses for new social media account registrations, data breaches, and public record updates.",
        status: "available",
        targetType: "email",
      },
      {
        name: "Phone Number Monitoring",
        description:
          "Track phone number changes, carrier updates, and virtual number detection alerts.",
        status: "available",
        targetType: "phone",
      },
      {
        name: "Name Monitoring",
        description:
          "Monitor for changes in address, contact information, and public records for individuals.",
        status: "available",
        targetType: "name",
      },
      {
        name: "Social Media Presence Tracking",
        description:
          "Monitor for new social media account creations and profile updates across 48+ platforms.",
        status: "available",
        targetType: "email",
      },
      {
        name: "Comprehensive Person Monitoring",
        description:
          "Full-service monitoring combining all data sources with weekly automated reports.",
        status: "enterprise",
        targetType: "comprehensive",
      },
    ]

    return NextResponse.json({
      success: true,
      services,
      disclaimer:
        "This service is for legal and ethical use only with proper consent and authorization. Unauthorized surveillance is illegal. Users must have permissible purpose under applicable laws (e.g., FCRA, GLBA).",
      note: targetType && targetValue
        ? "Please sign in to create monitoring subscriptions."
        : "Use the monitoring dashboard to create subscriptions for email, phone, or name monitoring.",
    })
  } catch (error) {
    console.error("Relationship monitoring POST error:", error)
    return createErrorResponse(error, "An error occurred while processing monitoring request")
  }
}
