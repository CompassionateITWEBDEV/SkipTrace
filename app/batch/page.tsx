"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Download, Play, FileSpreadsheet, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { BatchSearchResult } from "@/lib/types"

export default function BatchSearchPage() {
  const [inputData, setInputData] = useState("")
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<BatchSearchResult[]>([])

  const handleProcess = async () => {
    setProcessing(true)
    // Simulate batch processing
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setResults([
      { input: "test@example.com", status: "success", matches: 12 },
      { input: "+1234567890", status: "success", matches: 8 },
    ])
    setProcessing(false)
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Batch Search Processing</h1>
          <p className="text-muted-foreground mt-2">
            Upload or paste multiple queries for bulk skip tracing operations
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Input Data</CardTitle>
              <CardDescription>
                Enter one query per line (emails, phones, names, or addresses)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="john.doe@example.com&#10;+1 (555) 123-4567&#10;Jane Smith&#10;123 Main St, Chicago"
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
                  <FileSpreadsheet className="h-4 w-4" />
                  Upload Excel
                </Button>
              </div>
              <Button className="w-full gap-2" onClick={handleProcess} disabled={processing || !inputData}>
                <Play className="h-4 w-4" />
                {processing ? "Processing..." : "Start Batch Search"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Processing Status</CardTitle>
              <CardDescription>Real-time batch processing results</CardDescription>
            </CardHeader>
            <CardContent>
              {results.length > 0 ? (
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Processed {results.length} queries successfully
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    {results.map((result, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between border border-border rounded-lg p-3"
                      >
                        <span className="text-sm font-mono">{result.input}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {result.matches} matches
                          </span>
                          <span className="px-2 py-1 text-xs rounded-full bg-green-500/10 text-green-600">
                            Success
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full gap-2 bg-transparent" variant="outline">
                    <Download className="h-4 w-4" />
                    Export Results
                  </Button>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center border border-dashed border-border rounded-lg">
                  <div className="text-center text-muted-foreground">
                    <FileSpreadsheet className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No results yet</p>
                    <p className="text-sm">Start batch processing to see results</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Batch Processing Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium mb-2">Bulk Upload</h4>
                <p className="text-sm text-muted-foreground">
                  Process up to 10,000 queries in a single batch operation
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Multi-Format Support</h4>
                <p className="text-sm text-muted-foreground">
                  Upload CSV, Excel, or paste data directly for processing
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Export Results</h4>
                <p className="text-sm text-muted-foreground">
                  Download comprehensive reports in multiple formats
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
