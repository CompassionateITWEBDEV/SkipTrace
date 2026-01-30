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
import { toast } from "sonner"
import type { EnrichmentResult } from "@/lib/types"
import { generateDetailedSummary } from "@/lib/summary-generator"
import { correlatePersonData } from "@/lib/data-correlation"

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

      if (response.status === 429) {
        setError("Search limit reached. Please upgrade your plan or try again later.")
        toast.error("Rate limit exceeded", {
          description: "Upgrade your plan for higher limits.",
          action: { label: "View plans", onClick: () => window.location.assign("/pricing") },
        })
        return
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setError(data.error || "Search failed. Please try again.")
        return
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
                autoComplete="email"
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
                autoComplete="tel"
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
                autoComplete="street-address"
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
                  variant={results.confidenceScore > 70 ? "default" : results.confidenceScore > 40 ? "secondary" : "outline"}
                  className="text-sm"
                >
                  {results.confidenceScore}% Confidence
                </Badge>
                {results.dataQuality && (
                  <Badge
                    variant={results.dataQuality === "high" ? "default" : results.dataQuality === "medium" ? "secondary" : "outline"}
                    className="text-sm"
                  >
                    {results.dataQuality.charAt(0).toUpperCase() + results.dataQuality.slice(1)} Quality
                  </Badge>
                )}
              </div>
            </div>
            <Progress value={results.confidenceScore} className="mt-4" />
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* AI-Generated Summary */}
            {(() => {
              const sources = [
                results.skipTraceData,
                results.socialMediaData,
                results.phoneValidation,
                results.nameSearchData,
              ].filter(Boolean)

              if (sources.length > 0) {
                const correlated = correlatePersonData(sources)
                const summary = generateDetailedSummary(correlated.correlatedData, results.confidenceScore)

                return (
                  <div className="space-y-2 p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      AI-Generated Summary
                    </h3>
                    <p className="text-sm leading-relaxed">{summary}</p>
                    {correlated.matchingFields.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="text-xs text-muted-foreground">Matching fields:</span>
                        {correlated.matchingFields.map((field) => (
                          <Badge key={field} variant="outline" className="text-xs capitalize">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {correlated.conflicts.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-yellow-600 mb-1">Conflicts detected:</p>
                        <ul className="text-xs text-muted-foreground list-disc list-inside">
                          {correlated.conflicts.map((conflict, idx) => (
                            <li key={idx}>{conflict}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )
              }
              return null
            })()}

            {results.skipTraceData && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Skip Trace Results</h3>
                <div className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-60">
                  <pre>{JSON.stringify(results.skipTraceData, null, 2)}</pre>
                </div>
              </div>
            )}

            {results.socialMediaData && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Social Media Presence</h3>
                <div className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-60">
                  <pre>{JSON.stringify(results.socialMediaData, null, 2)}</pre>
                </div>
              </div>
            )}

            {results.phoneValidation && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Phone Validation</h3>
                <div className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-60">
                  <pre>{JSON.stringify(results.phoneValidation, null, 2)}</pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
