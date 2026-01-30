"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, Download, Play, AlertCircle, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Papa from "papaparse"
import { BATCH_ADDRESS_CSV_COLUMNS, type BatchAddressRow } from "@/lib/batch-address-utils"

const MAX_ADDRESSES = 20

function parseAddressesFromCsv(data: unknown[]): Array<{ street: string; citystatezip?: string; city?: string; state?: string; zip?: string }> {
  const addresses: Array<{ street: string; citystatezip?: string; city?: string; state?: string; zip?: string }> = []
  for (const row of data) {
    if (!row || typeof row !== "object") continue
    const r = row as Record<string, unknown>
    const street = [r.Street, r.street].map((v) => (typeof v === "string" ? v.trim() : "")).find(Boolean) ?? ""
    if (!street) continue
    const citystatezip = [r.CityStateZip, r.citystatezip].map((v) => (typeof v === "string" ? v.trim() : "")).find(Boolean)
    const city = typeof r.City === "string" ? r.City.trim() : typeof r.city === "string" ? r.city.trim() : undefined
    const state = typeof r.State === "string" ? r.State.trim() : typeof r.state === "string" ? r.state.trim() : undefined
    const zip = typeof r.Zip === "string" ? r.Zip.trim() : typeof r.zip === "string" ? r.zip.trim() : undefined
    addresses.push({ street, citystatezip, city, state, zip })
  }
  return addresses
}

export default function BatchAddressPage() {
  const [addresses, setAddresses] = useState<Array<{ street: string; citystatezip?: string; city?: string; state?: string; zip?: string }>>([])
  const [processing, setProcessing] = useState(false)
  const [rows, setRows] = useState<BatchAddressRow[]>([])
  const [summary, setSummary] = useState<{ totalAddresses: number; totalPeople: number; requestsUsed: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setError(null)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result: Papa.ParseResult<Record<string, string>>) => {
        const data = result.data as unknown[]
        const parsed = parseAddressesFromCsv(data)
        if (parsed.length === 0) {
          setError("CSV must have a 'Street' column (and 'CityStateZip' or 'City', 'State', 'Zip').")
          return
        }
        if (parsed.length > MAX_ADDRESSES) {
          setError(`Maximum ${MAX_ADDRESSES} addresses per batch. Your file has ${parsed.length}. Only the first ${MAX_ADDRESSES} will be used.`)
          setAddresses(parsed.slice(0, MAX_ADDRESSES))
        } else {
          setAddresses(parsed)
        }
      },
    })
  }

  const downloadTemplate = () => {
    const header = "Street,CityStateZip\n3828 Double Oak Ln,\"Irving, TX 75061\""
    const blob = new Blob([header], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "batch_address_template.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  const downloadTemplateWithCityStateZip = () => {
    const header = "Street,City,State,Zip\n3828 Double Oak Ln,Irving,TX,75061"
    const blob = new Blob([header], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "batch_address_template_city_state_zip.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleRunBatch = async () => {
    if (addresses.length === 0) return
    setProcessing(true)
    setError(null)
    setRows([])
    setSummary(null)
    try {
      const response = await fetch("/api/batch-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error ?? "Batch address request failed")
        setProcessing(false)
        return
      }
      setRows(data.rows ?? [])
      setSummary(data.summary ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setProcessing(false)
    }
  }

  const exportCsv = () => {
    if (rows.length === 0) return
    const csv = Papa.unparse(rows, { columns: [...BATCH_ADDRESS_CSV_COLUMNS] })
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `batch_address_results_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Batch Address Skip-Trace</h1>
          <p className="text-muted-foreground">
            Upload a CSV of addresses (Street + CityStateZip or Street, City, State, Zip). One row per person with full details is returned; export as CSV.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Input Addresses</CardTitle>
              <CardDescription>
                CSV with columns: Street and CityStateZip (or Street, City, State, Zip). Max {MAX_ADDRESSES} addresses per batch.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                  Upload CSV
                </Button>
                <Button variant="outline" className="gap-2" onClick={downloadTemplate}>
                  <Download className="h-4 w-4" />
                  Template (Street, CityStateZip)
                </Button>
                <Button variant="outline" className="gap-2" onClick={downloadTemplateWithCityStateZip}>
                  <Download className="h-4 w-4" />
                  Template (Street, City, State, Zip)
                </Button>
                {addresses.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      setAddresses([])
                      setRows([])
                      setSummary(null)
                      setError(null)
                      if (fileInputRef.current) fileInputRef.current.value = ""
                    }}
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>

              {addresses.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {addresses.length} address(es) loaded. Each address uses 1 request; each person found uses 1 additional request (details).
                </p>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Batch may use many API requests (1 per address + 1 per person).
                </AlertDescription>
              </Alert>

              <Button
                className="w-full gap-2"
                onClick={handleRunBatch}
                disabled={addresses.length === 0 || processing}
              >
                <Play className="h-4 w-4" />
                {processing ? "Running batch…" : "Run Batch Address Skip-Trace"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle>Results</CardTitle>
                  <CardDescription>
                    {summary
                      ? `${summary.totalPeople} person(s) from ${summary.totalAddresses} address(es). ${summary.requestsUsed} API requests used.`
                      : "Results will appear here after running the batch."}
                  </CardDescription>
                </div>
                {rows.length > 0 && (
                  <Button variant="outline" className="gap-2" onClick={exportCsv}>
                    <Download className="h-4 w-4" />
                    Download CSV
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {rows.length > 0 ? (
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        {BATCH_ADDRESS_CSV_COLUMNS.map((col) => (
                          <th key={col} className="text-left px-2 py-2 font-medium whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => (
                        <tr key={idx} className="border-t border-border">
                          {BATCH_ADDRESS_CSV_COLUMNS.map((col) => (
                            <td key={col} className="px-2 py-1.5 whitespace-nowrap max-w-[200px] truncate" title={row[col]}>
                              {row[col] || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[400px] border-2 border-dashed border-border rounded-lg">
                  <p className="text-muted-foreground">No results yet. Upload a CSV and run the batch.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
