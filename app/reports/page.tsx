"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Download, Eye, Calendar, User, Mail, Phone, MapPin, Loader2 } from "lucide-react"
import Link from "next/link"
import { exportToPDF } from "@/lib/export-utils"

interface Report {
  id: string
  title: string
  searchType: string
  createdAt: string
  query: string
  results?: unknown // Optional because list view doesn't include results
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      const response = await fetch("/api/reports")
      if (response.ok) {
        const data = await response.json()
        setReports(data.reports || [])
      }
    } catch (error) {
      console.error("Error fetching reports:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (report: Report) => {
    try {
      // If results are not available (e.g., from list view), fetch the full report
      if (!report.results) {
        const response = await fetch(`/api/reports/${report.id}`)
        if (response.ok) {
          const data = await response.json()
          if (data.report && data.report.results) {
            const queryObj = typeof data.report.query === "string" ? JSON.parse(data.report.query) : data.report.query
            await exportToPDF(data.report.results, data.report.title || "report", data.report.title, data.report.searchType, queryObj)
            return
          }
        }
        console.error("Cannot export report: no results data available")
        return
      }
      
      const queryObj = typeof report.query === "string" ? JSON.parse(report.query) : report.query
      await exportToPDF(report.results, report.title || "report", report.title, report.searchType, queryObj)
    } catch (error) {
      console.error("Error exporting report:", error)
    }
  }

  const getQueryDisplay = (query: string): string => {
    try {
      const queryObj = typeof query === "string" ? JSON.parse(query) : query
      return queryObj.email || queryObj.phone || queryObj.name || queryObj.street || JSON.stringify(queryObj)
    } catch {
      return query
    }
  }

  const getResultsCount = (results: unknown): number => {
    if (!results || typeof results !== "object") return 0
    const resultsObj = results as Record<string, unknown>
    const skipTrace = resultsObj.skipTrace || resultsObj.skipTraceData
    if (skipTrace && typeof skipTrace === "object") {
      const person = (skipTrace as Record<string, unknown>).person
      if (person && typeof person === "object") {
        const personData = person as Record<string, unknown>
        let count = 0
        if (Array.isArray(personData.names)) count += personData.names.length
        if (Array.isArray(personData.emails)) count += personData.emails.length
        if (Array.isArray(personData.phones)) count += personData.phones.length
        if (Array.isArray(personData.addresses)) count += personData.addresses.length
        return count
      }
    }
    return Object.keys(resultsObj).length
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />
      case "name":
        return <User className="h-4 w-4" />
      case "phone":
        return <Phone className="h-4 w-4" />
      case "address":
        return <MapPin className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Search Reports</h1>
          <p className="text-muted-foreground">View and manage your search history and reports</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-4">
            {reports.map((report) => {
              const queryDisplay = getQueryDisplay(report.query)
              const resultsCount = report.results ? getResultsCount(report.results) : 0
              const type = report.searchType.toLowerCase().replace("_", "")

              return (
                <Card key={report.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          {getIcon(type)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{report.title}</CardTitle>
                          <CardDescription className="flex items-center gap-4 mt-1">
                            <span className="capitalize">{type} Search</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(report.createdAt).toLocaleDateString()}
                            </span>
                          </CardDescription>
                          <p className="text-sm text-muted-foreground mt-1 font-mono">{queryDisplay}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{resultsCount}</div>
                        <div className="text-xs text-muted-foreground">Results</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Link href={`/reports/${report.id}`} className="flex-1">
                        <Button variant="default" size="sm" className="w-full gap-2">
                          <Eye className="h-4 w-4" />
                          View Report
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 bg-transparent"
                        onClick={() => handleExport(report)}
                      >
                        <Download className="h-4 w-4" />
                        Export
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {!loading && reports.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Reports Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start searching to generate your first report
              </p>
              <Link href="/search">
                <Button>Go to Search</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
