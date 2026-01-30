"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

const PLAN_TO_API: Record<string, "STARTER" | "PROFESSIONAL" | "ENTERPRISE"> = {
  Starter: "STARTER",
  Professional: "PROFESSIONAL",
  Enterprise: "ENTERPRISE",
}

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "sales@example.com"

interface PricingCtaProps {
  planName: string
  price: string
  popular?: boolean
}

export function PricingCta({ planName, price, popular }: PricingCtaProps) {
  const [loading, setLoading] = useState(false)
  const { data: session, status } = useSession()
  const router = useRouter()
  const isCustom = price === "Custom"
  const planKey = PLAN_TO_API[planName]

  const handleGetStarted = async () => {
    if (!planKey) return
    setLoading(true)
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }
      if (res.status === 401) {
        router.push("/auth/signin?callbackUrl=/pricing")
        return
      }
      if (data.error) {
        alert(data.error)
      }
    } catch (e) {
      console.error(e)
      alert("Failed to start checkout")
    } finally {
      setLoading(false)
    }
  }

  const handleContactSales = () => {
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=SkipTrace Enterprise - Custom pricing`
  }

  if (status === "loading" || loading) {
    return (
      <Button className="w-full mb-6" variant={popular ? "default" : "outline"} disabled>
        Loading...
      </Button>
    )
  }

  if (isCustom) {
    return (
      <Button
        className="w-full mb-6"
        variant={popular ? "default" : "outline"}
        onClick={handleContactSales}
      >
        Contact Sales
      </Button>
    )
  }

  return (
    <Button
      className="w-full mb-6"
      variant={popular ? "default" : "outline"}
      onClick={handleGetStarted}
    >
      {session ? "Get Started" : "Sign in to get started"}
    </Button>
  )
}
