import { Suspense } from "react"
import { SearchSection } from "@/components/search-section"
import { ComprehensiveSearch } from "@/components/comprehensive-search"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Loading from "./loading"

export const metadata = {
  title: "Search Dashboard - MASE Intelligence Skip-Tracer",
  description: "Search for people by name, email, phone, or address with AI-powered data correlation",
}

export default function SearchPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Search Dashboard</h1>
          <p className="text-muted-foreground">
            Find anyone across multiple data sources with our comprehensive skip tracing tools
          </p>
        </div>
        
        <Tabs defaultValue="individual" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="individual">Individual Search</TabsTrigger>
            <TabsTrigger value="comprehensive">AI-Enhanced Search</TabsTrigger>
          </TabsList>
          
          <TabsContent value="individual">
            <Suspense fallback={<Loading />}>
              <SearchSection />
            </Suspense>
          </TabsContent>
          
          <TabsContent value="comprehensive">
            <ComprehensiveSearch />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
