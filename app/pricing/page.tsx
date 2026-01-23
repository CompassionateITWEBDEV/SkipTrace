import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check } from "lucide-react"

export const metadata = {
  title: "Pricing - SkipTrace Pro",
  description: "Choose the perfect plan for your skip tracing needs",
}

export default function PricingPage() {
  const plans = [
    {
      name: "Starter",
      price: "$49",
      description: "Perfect for individuals and small teams",
      features: [
        "100 searches per month",
        "Email & name search",
        "Basic phone lookup",
        "Social media detection (10 platforms)",
        "Email support",
        "Export to CSV",
      ],
    },
    {
      name: "Professional",
      price: "$149",
      description: "For growing businesses and agencies",
      popular: true,
      features: [
        "500 searches per month",
        "All search types",
        "Advanced phone validation",
        "Social media detection (48+ platforms)",
        "Priority support",
        "API access",
        "Export to CSV & PDF",
        "Relationship monitoring",
      ],
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For large organizations with custom needs",
      features: [
        "Unlimited searches",
        "All features included",
        "Dedicated account manager",
        "Custom integrations",
        "SLA guarantee",
        "White-label options",
        "Advanced analytics",
        "Priority API access",
      ],
    },
  ]

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-muted-foreground">
            Choose the plan that fits your skip tracing needs
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={plan.popular ? "border-primary shadow-lg" : ""}
            >
              {plan.popular && (
                <div className="bg-primary text-primary-foreground text-center py-2 text-sm font-semibold rounded-t-lg">
                  Most Popular
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.price !== "Custom" && (
                    <span className="text-muted-foreground">/month</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full mb-6"
                  variant={plan.popular ? "default" : "outline"}
                >
                  {plan.price === "Custom" ? "Contact Sales" : "Get Started"}
                </Button>
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Need a Custom Solution?</h2>
          <p className="text-muted-foreground mb-6">
            Contact our sales team for enterprise pricing and custom integrations
          </p>
          <Button size="lg">Contact Sales</Button>
        </div>
      </div>
    </main>
  )
}
