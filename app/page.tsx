import { Hero } from "@/components/hero"
import { Features } from "@/components/features"
import { PlatformGrid } from "@/components/platform-grid"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export default function Page() {
  return (
    <main className="min-h-screen">
      <Hero />
      <div className="py-12 bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Searching?</h2>
          <p className="text-muted-foreground mb-8">
            Access our powerful skip tracing database with multiple search methods
          </p>
          <Link href="/search">
            <Button size="lg" className="gap-2">
              Go to Search Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
      <Features />
      <PlatformGrid />
    </main>
  )
}
