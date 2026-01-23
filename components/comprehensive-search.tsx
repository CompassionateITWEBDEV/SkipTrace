"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Search, TrendingUp, CheckCircle2, AlertTriangle } from "lucide-react"
import type { EnrichmentResult } from "@/lib/types"

export function ComprehensiveSearch() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [results, setResults] = useState<EnrichmentResult | null>(null)
  const [error, setError] = useState("")

  const handleSearch = async () => {
    if (!email && !phone && !name && !address) {
      setError("Please provide at least one search parameter")
      return
    }

    setLoading(true)
    setError("")
    setResults(null)

    try {
      const response = await fetch("/api/enrich-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone, name, address }),
      })

      if (!response.ok) {
        throw new Error("Search failed")
      }

      const data = await response.json()
      setResults(data)
    } catch {
      setError("Search failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Comprehensive Data Enrichment
          </CardTitle>
          <CardDescription>
            Enter multiple data points for enhanced accuracy. Our AI will correlate information across all sources.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+1 234 567 8900"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                type="text"
                placeholder="123 Main St, City, ST"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button onClick={handleSearch} disabled={loading} className="w-full" size="lg">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enriching Data...
              </>
            ) : (
              <>
                <TrendingUp className="mr-2 h-4 w-4" />
                Run Comprehensive Search
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {results && (
        <Card className="border-2 border-primary/20">
          <CardHeader className="bg-primary/5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Enriched Data Report
              </CardTitle>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-sm">
                  {results.dataPoints} Data Points
                </Badge>
                <Badge
                  variant={results.confidenceScore > 70 ? "default" : "secondary"}
                  className="text-sm"
                >
                  {results.confidenceScore}% Confidence
                </Badge>
              </div>
            </div>
            <Progress value={results.confidenceScore} className="mt-4" />
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {results.skipTraceData && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Skip Trace Results</h3>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-60">
                  {JSON.stringify(results.skipTraceData, null, 2)}
                </pre>
              </div>
            )}

            {results.socialMediaData && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Social Media Presence</h3>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-60">
                  {JSON.stringify(results.socialMediaData, null, 2)}
                </pre>
              </div>
            )}

            {results.phoneValidation && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Phone Validation</h3>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-60">
                  {JSON.stringify(results.phoneValidation, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
