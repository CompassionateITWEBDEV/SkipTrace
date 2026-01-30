"use client"

import { useState, useRef, useEffect } from "react"
import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Download, Play, AlertCircle, FileText, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import type { BatchSearchResult } from "@/lib/types"
import { toast } from "sonner"
import Papa from "papaparse"
import * as XLSX from "xlsx"

export default function BatchSearchPage() {
  const [inputData, setInputData] = useState("")
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<BatchSearchResult[]>([])
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [filterStatus, setFilterStatus] = useState<"all" | "success" | "error" | "not_found">("all")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const fileExtension = file.name.split(".").pop()?.toLowerCase()

    if (fileExtension === "csv") {
      Papa.parse(file, {
        complete: (results: Papa.ParseResult<unknown>) => {
          // Extract first column or all columns as input
          const lines = results.data
            .map((row: unknown) => {
              if (Array.isArray(row)) {
                return row[0] // First column
              }
              return null
            })
            .filter((line: unknown): line is string => typeof line === "string" && line.trim().length > 0)
            .map((line: string) => line.trim())

          setInputData(lines.join("\n"))
        },
        header: false,
      })
    } else if (fileExtension === "xlsx" || fileExtension === "xls") {
      const reader = new FileReader()
      reader.onload = (e) => {
        const data = e.target?.result
        if (data) {
          const workbook = XLSX.read(data, { type: "binary" })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][]
          const lines = jsonData
            .map((row) => row[0])
            .filter((line): line is string => typeof line === "string" && line.trim().length > 0)
            .map((line) => line.trim())

          setInputData(lines.join("\n"))
        }
      }
      reader.readAsBinaryString(file)
    } else {
      alert("Please upload a CSV or Excel file (.csv, .xlsx, .xls)")
    }
  }

  const downloadTemplate = () => {
    const template = "email\nphone\nname"
    const blob = new Blob([template], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "batch_search_template.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportResults = () => {
    if (results.length === 0) return

    // Enhanced export with full result data
    const csvData = results.map((result) => {
      const baseRow: Record<string, unknown> = {
        input: result.input,
        type: result.type,
        status: result.status,
        resultsCount: result.results || 0,
        error: result.error || "",
      }
      
      // If result has detailed data, include key fields
      if (result.results && typeof result.results === "object") {
        const resultObj = result.results as Record<string, unknown>
        if (resultObj.skipTrace) {
          const skipTrace = resultObj.skipTrace as { person?: { names?: unknown[]; emails?: unknown[]; phones?: unknown[] } }
          const person = skipTrace.person
          if (person) {
            baseRow.names = Array.isArray(person.names) ? person.names.join("; ") : ""
            baseRow.emails = Array.isArray(person.emails) ? person.emails.join("; ") : ""
            baseRow.phones = Array.isArray(person.phones) ? person.phones.join("; ") : ""
          }
        }
      }
      
      return baseRow
    })

    const csv = Papa.unparse(csvData)
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `batch_search_results_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportResultsExcel = () => {
    if (results.length === 0) return

    // Export to Excel format
    const excelData = results.map((result) => {
      const baseRow: Record<string, unknown> = {
        Input: result.input,
        Type: result.type,
        Status: result.status,
        "Results Count": result.results || 0,
        Error: result.error || "",
      }
      
      // Include detailed data if available
      if (result.results && typeof result.results === "object") {
        const resultObj = result.results as Record<string, unknown>
        if (resultObj.skipTrace) {
          const skipTrace = resultObj.skipTrace as { person?: { names?: unknown[]; emails?: unknown[]; phones?: unknown[]; addresses?: unknown[] } }
          const person = skipTrace.person
          if (person) {
            baseRow.Names = Array.isArray(person.names) ? person.names.join("; ") : ""
            baseRow.Emails = Array.isArray(person.emails) ? person.emails.join("; ") : ""
            baseRow.Phones = Array.isArray(person.phones) ? person.phones.join("; ") : ""
            baseRow.Addresses = Array.isArray(person.addresses) ? person.addresses.join("; ") : ""
          }
        }
      }
      
      return baseRow
    })

    const worksheet = XLSX.utils.json_to_sheet(excelData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Batch Results")
    XLSX.writeFile(workbook, `batch_search_results_${new Date().toISOString().split("T")[0]}.xlsx`)
  }

  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<string | null>(null)

  // Poll for job status if we have a jobId
  useEffect(() => {
    if (!jobId || !processing) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/batch-search/status?jobId=${jobId}`)
        if (response.ok) {
          const data = await response.json()
          setJobStatus(data.status)
          
          if (data.processedCount !== undefined && data.inputCount !== undefined) {
            setProgress({ current: data.processedCount, total: data.inputCount })
          }

          if (data.status === "COMPLETED" || data.status === "FAILED") {
            setProcessing(false)
            clearInterval(pollInterval)
            
            if (data.status === "COMPLETED" && data.results) {
              const resultsArray = Array.isArray(data.results) ? data.results : []
              const transformedResults = resultsArray.map((result: { input: string; status: string; results?: unknown; error?: string; type?: string }) => ({
                input: result.input,
                type: result.type || "unknown",
                status: result.status === "success" ? "success" : result.status === "not_found" ? "not_found" : "error",
                results: result.results ? (typeof result.results === "object" ? Object.keys(result.results).length : 1) : 0,
                error: result.error,
              }))
              setResults(transformedResults)
            } else if (data.status === "FAILED") {
              setResults([
                {
                  input: "Batch job failed",
                  type: "unknown",
                  status: "error",
                  results: 0,
                  error: data.error || "Batch processing failed",
                },
              ])
            }
          }
        }
      } catch (error) {
        console.error("Error polling job status:", error)
      }
    }, 2000) // Poll every 2 seconds

    return () => clearInterval(pollInterval)
  }, [jobId, processing])

  const handleBatchSearch = async () => {
    if (!inputData.trim()) return

    setProcessing(true)
    setResults([])
    setProgress({ current: 0, total: 0 })
    setJobId(null)
    setJobStatus(null)

    try {
      // Split input by lines and filter empty lines
      const lines = inputData
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)

      if (lines.length === 0) {
        setProcessing(false)
        return
      }

      setProgress({ current: 0, total: lines.length })

      // Call the batch search API
      const response = await fetch("/api/batch-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: lines, maxConcurrency: 5 }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Check if this is a background job
        if (data.jobId) {
          setJobId(data.jobId)
          setJobStatus(data.status || "PENDING")
          // Polling will handle updates
        } else if (data.results) {
          // Synchronous results
          const transformedResults = data.results.map((result: { input: string; status: string; results?: unknown; error?: string; type?: string }) => ({
            input: result.input,
            type: result.type || "unknown",
            status: result.status === "success" ? "success" : result.status === "not_found" ? "not_found" : "error",
            results: result.results ? (typeof result.results === "object" ? Object.keys(result.results).length : 1) : 0,
            error: result.error,
          }))
          setResults(transformedResults)
          setProgress({ current: transformedResults.length, total: lines.length })
          setProcessing(false)
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        const isRateLimit = response.status === 429
        const message = isRateLimit
          ? "Rate limit exceeded. Please try again later or upgrade your plan for higher limits."
          : (errorData.error as string) || "Failed to process batch search"
        if (isRateLimit) {
          toast.error("Rate limit exceeded", {
            description: "Upgrade your plan for higher limits.",
            action: { label: "View plans", onClick: () => window.location.assign("/pricing") },
          })
        }
        setResults([
          {
            input: "Batch search error",
            type: "unknown",
            status: "error",
            results: 0,
            error: message,
          },
        ])
        setProcessing(false)
      }
    } catch (error) {
      console.error("Batch search error:", error)
      setResults([
        {
          input: "Batch search error",
          type: "unknown",
          status: "error",
          results: 0,
          error: error instanceof Error ? error.message : "An error occurred",
        },
      ])
      setProcessing(false)
    }
  }

  const filteredResults = results.filter((result) => {
    if (filterStatus === "all") return true
    return result.status === filterStatus
  })

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
                id="batch-search-input"
                name="batchSearchInput"
                autoComplete="off"
                placeholder="john.doe@example.com&#10;+1 555-0123&#10;Jane Smith&#10;..."
                className="min-h-[300px] font-mono text-sm"
                value={inputData}
                onChange={(e) => setInputData(e.target.value)}
              />

              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="outline"
                  className="gap-2 bg-transparent"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  Upload CSV/Excel
                </Button>
                <Button variant="outline" className="gap-2 bg-transparent" onClick={downloadTemplate}>
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
                {inputData && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      setInputData("")
                      if (fileInputRef.current) fileInputRef.current.value = ""
                    }}
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>

              {processing && progress.total > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">
                      {progress.current} / {progress.total}
                      {jobStatus && ` (${jobStatus})`}
                    </span>
                  </div>
                  <Progress value={(progress.current / progress.total) * 100} />
                  {jobId && (
                    <p className="text-xs text-muted-foreground">
                      Job ID: {jobId.substring(0, 8)}... (processing in background)
                    </p>
                  )}
                </div>
              )}

              <Button
                className="w-full gap-2"
                onClick={handleBatchSearch}
                disabled={!inputData.trim() || processing}
              >
                <Play className="h-4 w-4" />
                {processing ? `Processing... (${progress.current}/${progress.total})` : "Start Batch Search"}
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Results</CardTitle>
                  <CardDescription>
                    {results.length > 0
                      ? `${results.filter((r) => r.status === "success").length} successful out of ${results.length}`
                      : "Results will appear here"}
                  </CardDescription>
                </div>
                {results.length > 0 && (
                  <div className="flex gap-2">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                      className="text-sm border rounded-md px-2 py-1"
                    >
                      <option value="all">All</option>
                      <option value="success">Success</option>
                      <option value="not_found">Not Found</option>
                      <option value="error">Errors</option>
                    </select>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {results.length > 0 ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filteredResults.map((result, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border border-border rounded-lg"
                    >
                      <div className="flex-1 truncate">
                        <p className="text-sm font-medium truncate">{result.input}</p>
                        <p className="text-xs text-muted-foreground">
                          {result.status === "error" && "error" in result
                            ? result.error || "Error occurred"
                            : result.results
                              ? `${result.results} results found`
                              : "No results"}
                        </p>
                      </div>
                      <Badge
                        variant={
                          result.status === "success"
                            ? "default"
                            : result.status === "not_found"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {result.status === "success" ? "Found" : result.status === "not_found" ? "Not Found" : "Error"}
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
                <div className="flex gap-2 mt-4 flex-wrap">
                  <Button variant="outline" className="flex-1 gap-2 bg-transparent" onClick={exportResults}>
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button variant="outline" className="flex-1 gap-2 bg-transparent" onClick={exportResultsExcel}>
                    <FileText className="h-4 w-4" />
                    Export Excel
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 bg-transparent"
                    onClick={() => {
                      const successfulResults = results.filter((r) => r.status === "success")
                      const csvData = successfulResults.map((result) => ({
                        input: result.input,
                        type: result.type,
                        status: result.status,
                        results: result.results || 0,
                      }))
                      const csv = Papa.unparse(csvData)
                      const blob = new Blob([csv], { type: "text/csv" })
                      const url = URL.createObjectURL(blob)
                      const link = document.createElement("a")
                      link.href = url
                      link.download = `batch_search_successful_${new Date().toISOString().split("T")[0]}.csv`
                      link.click()
                      URL.revokeObjectURL(url)
                    }}
                  >
                    <FileText className="h-4 w-4" />
                    Successful Only
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
