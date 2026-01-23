"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import { Check, CreditCard, Zap, Building2, Crown } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Plan {
  id: string
  name: string
  price: string
  description: string
  features: string[]
  limits: {
    searchesPerMonth: number
    searchesPerDay: number
    batchSize: number
  }
  icon: React.ReactNode
}

const plans: Plan[] = [
  {
    id: "STARTER",
    name: "Starter",
    price: "$29",
    description: "Perfect for individual investigators",
    features: [
      "500 searches per month",
      "50 searches per day",
      "Batch processing (up to 100 items)",
      "Email support",
      "API access",
    ],
    limits: {
      searchesPerMonth: 500,
      searchesPerDay: 50,
      batchSize: 100,
    },
    icon: <Zap className="h-6 w-6" />,
  },
  {
    id: "PROFESSIONAL",
    name: "Professional",
    price: "$99",
    description: "For teams and agencies",
    features: [
      "5,000 searches per month",
      "500 searches per day",
      "Batch processing (up to 1,000 items)",
      "Priority support",
      "Advanced API access",
      "Monitoring subscriptions",
    ],
    limits: {
      searchesPerMonth: 5000,
      searchesPerDay: 500,
      batchSize: 1000,
    },
    icon: <Building2 className="h-6 w-6" />,
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations",
    features: [
      "100,000+ searches per month",
      "10,000 searches per day",
      "Unlimited batch processing",
      "Dedicated support",
      "Custom integrations",
      "Advanced monitoring",
      "SLA guarantee",
      "Custom reporting",
    ],
    limits: {
      searchesPerMonth: 100000,
      searchesPerDay: 10000,
      batchSize: 10000,
    },
    icon: <Crown className="h-6 w-6" />,
  },
]

export default function BillingPage() {
  const [currentPlan, setCurrentPlan] = useState<string>("FREE")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCurrentPlan()
  }, [])

  async function fetchCurrentPlan() {
    try {
      // In production, fetch from /api/account endpoint
      const response = await fetch("/api/account")
      if (response.ok) {
        const data = await response.json()
        setCurrentPlan(data.plan || "FREE")
      }
    } catch (err) {
      console.error("Failed to fetch current plan:", err)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpgrade(planId: string) {
    try {
      setError(null)
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.checkoutUrl) {
          // In production, redirect to Stripe Checkout
          window.location.href = data.checkoutUrl
        } else {
          setError("Checkout URL not available. Please contact support.")
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to initiate checkout")
      }
    } catch (err) {
      setError("Network error. Please try again.")
      console.error("Upgrade error:", err)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Billing & Plans</h1>
          <p className="text-muted-foreground mt-2">
            Choose the plan that fits your needs. Upgrade or downgrade at any time.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading plans...</div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => {
              const isCurrentPlan = currentPlan === plan.id
              const isUpgrade = currentPlan === "FREE" || (currentPlan === "STARTER" && plan.id !== "STARTER")

              return (
                <Card
                  key={plan.id}
                  className={`relative ${isCurrentPlan ? "border-primary border-2" : ""}`}
                >
                  {isCurrentPlan && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Current Plan</Badge>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      {plan.icon}
                      <CardTitle>{plan.name}</CardTitle>
                    </div>
                    <div className="text-3xl font-bold">{plan.price}</div>
                    {plan.price !== "Custom" && <div className="text-sm text-muted-foreground">per month</div>}
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className="w-full"
                      variant={isCurrentPlan ? "outline" : "default"}
                      disabled={isCurrentPlan}
                      onClick={() => handleUpgrade(plan.id)}
                    >
                      {isCurrentPlan ? (
                        "Current Plan"
                      ) : plan.id === "ENTERPRISE" ? (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Contact Sales
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />
                          {isUpgrade ? "Upgrade" : "Change Plan"}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Free Plan</CardTitle>
            <CardDescription>Limited access for testing</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5" />
                <span>50 searches per month</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5" />
                <span>5 searches per day</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Basic features</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
