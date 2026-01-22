import { Suspense } from "react"
import { Hero } from "@/components/hero"
import { SearchSection } from "@/components/search-section"
import { Features } from "@/components/features"
import { PlatformGrid } from "@/components/platform-grid"

export default function Page() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Suspense fallback={null}>
        <SearchSection />
      </Suspense>
      <Features />
      <PlatformGrid />
    </main>
  )
}
