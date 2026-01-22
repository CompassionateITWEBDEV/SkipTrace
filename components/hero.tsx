import { Button } from "@/components/ui/button"
import { ShieldCheck } from "lucide-react"

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-accent/20 via-background to-background" />

      <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Trusted by investigators nationwide</span>
          </div>

          <h1 className="text-balance text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Locate Anyone with Powerful Skip Tracing
          </h1>

          <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Find hard-to-reach individuals instantly. Search across 48+ social platforms, verify emails, and access
            comprehensive background data all in one place.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg" className="h-12 px-8">
              Start Free Search
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 bg-transparent">
              View Pricing
            </Button>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">No credit card required • 3 free searches daily</p>
        </div>
      </div>
    </section>
  )
}
