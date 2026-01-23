"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, Loader2 } from "lucide-react"
import { exportToPDF } from "@/lib/export-utils"
import { SkipTraceResults } from "@/components/skip-trace-results"
import type { SkipTraceData, SocialMediaData } from "@/lib/types"

interface Report {
  id: string
  title: string
  query: string
  results: unknown
  searchType: string
  createdAt: string
}

export default function SharedReportPage({ params }: { params: Promise<{ token: string }> | { token: string } }) {
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    async function resolveParams() {
      const resolvedParams = params instanceof Promise ? await params : params
      setToken(resolvedParams.token)
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    if (token) {
      fetchSharedReport(token)
    }
  }, [token])

  const fetchSharedReport = async (sharedToken: string) => {
    try {
      const response = await fetch(`/api/reports/shared/${sharedToken}`)
      if (response.ok) {
        const data = await response.json()
        setReport(data.report)
      } else {
        setError("Report not found or link has expired")
      }
    } catch (err) {
      setError("Failed to load shared report")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (!report || !report.results) {
      console.error("Cannot export report: no report or results data")
      return
    }
    try {
      const queryObj = typeof report.query === "string" ? JSON.parse(report.query) : report.query
      exportToPDF(report.results, report.title || "report", report.title, report.searchType, queryObj)
    } catch (error) {
      console.error("Error exporting report:", error)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </main>
    )
  }

  if (error || !report) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-destructive">{error || "Report not found"}</p>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  const results = report.results as Record<string, unknown>
  const skipTrace = (results.skipTrace || results.skipTraceData) as SkipTraceData | null
  const socialMedia = (results.socialMedia || results.socialMediaData || {}) as SocialMediaData

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Card className="mb-6 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{report.title}</CardTitle>
                <CardDescription className="mt-2">
                  Shared Report • {new Date(report.createdAt).toLocaleDateString()}
                </CardDescription>
              </div>
              <Badge variant="secondary">Shared</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </CardContent>
        </Card>

        {skipTrace && (
          <SkipTraceResults
            data={{
              skipTrace,
              socialMedia,
              email: typeof report.query === "string" ? (JSON.parse(report.query) as { email?: string })?.email || "" : (report.query as { email?: string })?.email || "",
              searchedAt: report.createdAt,
            }}
            searchType={report.searchType.toLowerCase() as "email" | "phone" | "name" | "address" | "comprehensive"}
            query={typeof report.query === "string" ? JSON.parse(report.query) : report.query}
          />
        )}
      </div>
    </main>
  )
}
