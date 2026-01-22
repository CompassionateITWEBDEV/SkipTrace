import { Card, CardContent } from "@/components/ui/card"
import { Shield, Zap, Database, Lock, Users, PhoneOff, AlertTriangle, UserSearch } from "lucide-react"

const features = [
  {
    icon: Database,
    title: "48+ Platform Coverage",
    description:
      "Search across Apple, Facebook, LinkedIn, Instagram, Twitter, Discord, and 42 more platforms instantly",
  },
  {
    icon: PhoneOff,
    title: "Virtual Number Detection",
    description:
      "Block disposable, temporary & virtual phone numbers. Protect against fraud and fake accounts with real-time verification",
  },
  {
    icon: Shield,
    title: "Data Breach Detection",
    description: "Identify compromised accounts and security vulnerabilities with comprehensive breach monitoring",
  },
  {
    icon: Zap,
    title: "Instant Results",
    description: "Get comprehensive reports in seconds, not hours. Real-time data aggregation and analysis",
  },
  {
    icon: Lock,
    title: "100% Compliant",
    description: "FCRA compliant searches with full data privacy protection and legal compliance",
  },
  {
    icon: Users,
    title: "Contact Discovery",
    description: "Find phone numbers, email addresses, social profiles, and current addresses",
  },
  {
    icon: UserSearch,
    title: "Digital Forensics",
    description: "Advanced relationship monitoring and digital investigation tools for authorized legal use",
  },
  {
    icon: AlertTriangle,
    title: "Fraud Prevention",
    description: "Database updated multiple times daily to catch newly released virtual numbers and prevent OTP bypass",
  },
]

export function Features() {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Professional Skip Tracing Tools
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything you need to locate and verify individuals quickly and accurately
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title} className="border-2 transition-all hover:border-primary/50 hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
