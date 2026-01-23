"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Download, Play, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { BatchSearchResult } from "@/lib/types"

export default function BatchSearchPage() {
  const [inputData, setInputData] = useState("")
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<BatchSearchResult[]>([])

  const handleBatchSearch = async () => {
    setProcessing(true)
    // Simulate batch processing
    setTimeout(() => {
      const lines = inputData.split("\n").filter((line) => line.trim())
      const mockResults = lines.map((line) => ({
        input: line,
        status: Math.random() > 0.2 ? "success" : "not_found",
        results: Math.floor(Math.random() * 10),
      }))
      setResults(mockResults)
      setProcessing(false)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Batch Search</h1>
          <p className="text-muted-foreground">
            Process multiple searches simultaneously with bulk upload
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Input Data</CardTitle>
              <CardDescription>Enter emails, phone numbers, or names (one per line)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="john.doe@example.com&#10;+1 555-0123&#10;Jane Smith&#10;..."
                className="min-h-[300px] font-mono text-sm"
                value={inputData}
                onChange={(e) => setInputData(e.target.value)}
              />

              <div className="flex gap-2">
                <Button variant="outline" className="gap-2 bg-transparent">
                  <Upload className="h-4 w-4" />
                  Upload CSV
                </Button>
                <Button variant="outline" className="gap-2 bg-transparent">
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
              </div>

              <Button
                className="w-full gap-2"
                onClick={handleBatchSearch}
                disabled={!inputData.trim() || processing}
              >
                <Play className="h-4 w-4" />
                {processing ? "Processing..." : "Start Batch Search"}
              </Button>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Batch searches count as 1 credit per input line
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <CardDescription>
                {results.length > 0
                  ? `${results.filter((r) => r.status === "success").length} successful out of ${results.length}`
                  : "Results will appear here"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {results.length > 0 ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border border-border rounded-lg"
                    >
                      <div className="flex-1 truncate">
                        <p className="text-sm font-medium truncate">{result.input}</p>
                        <p className="text-xs text-muted-foreground">
                          {result.results} results found
                        </p>
                      </div>
                      <Badge variant={result.status === "success" ? "default" : "secondary"}>
                        {result.status === "success" ? "Found" : "Not Found"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[400px] border-2 border-dashed border-border rounded-lg">
                  <p className="text-muted-foreground">No results yet</p>
                </div>
              )}

              {results.length > 0 && (
                <Button variant="outline" className="w-full mt-4 gap-2 bg-transparent">
                  <Download className="h-4 w-4" />
                  Export Results
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
