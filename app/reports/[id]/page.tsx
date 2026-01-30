"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, ArrowLeft, Mail, Phone, MapPin, Briefcase, Globe, Loader2, Share2, Copy, Check } from "lucide-react"
import Link from "next/link"
import { exportToPDF } from "@/lib/export-utils"

interface Report {
  id: string
  title: string
  query: string
  results: unknown
  searchType: string
  createdAt: string
  updatedAt: string
  shared?: boolean
  sharedToken?: string | null
  shareUrl?: string
}

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Handle async params (Next.js 16)
  useEffect(() => {
    async function resolveParams() {
      const resolvedParams = params instanceof Promise ? await params : params
      setReportId(resolvedParams.id)
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    if (reportId) {
      fetchReport(reportId)
    }
  }, [reportId])

  const fetchReport = async (id: string) => {
    if (!id || id === "undefined") {
      setError("Invalid report ID")
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/reports/${id}`)
      if (response.ok) {
        const data = await response.json()
        setReport(data.report)
        if (data.report.shareUrl) {
          setShareUrl(data.report.shareUrl)
        }
      } else {
        setError("Report not found")
      }
    } catch (err) {
      setError("Failed to load report")
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

  const handleShare = async () => {
    if (!report) return

    try {
      const response = await fetch(`/api/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shared: !report.shared }),
      })

      if (response.ok) {
        const data = await response.json()
        setReport({ ...report, shared: data.report.shared, shareUrl: data.report.shareUrl })
        if (data.report.shareUrl) {
          setShareUrl(data.report.shareUrl)
        } else {
          setShareUrl(null)
        }
      }
    } catch (error) {
      console.error("Error sharing report:", error)
    }
  }

  const handleCopyLink = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleExportCSV = () => {
    if (!report?.results) return
    const flat: Record<string, string> = {}
    const walk = (obj: unknown, prefix = "") => {
      if (obj == null) return
      if (typeof obj !== "object") {
        flat[prefix] = String(obj)
        return
      }
      for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k
        if (v != null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
          walk(v, key)
        } else {
          flat[key] = v == null ? "" : String(v)
        }
      }
    }
    walk(report.results)
    const header = Object.keys(flat).join(",")
    const row = Object.values(flat).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    const blob = new Blob([header + "\n" + row], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${report.title || "report"}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportJSON = () => {
    if (!report?.results) return
    const blob = new Blob([JSON.stringify(report.results, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${report.title || "report"}.json`
    a.click()
    URL.revokeObjectURL(url)
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

  const queryObj = typeof report.query === "string" ? JSON.parse(report.query) : report.query
  const results = report.results as Record<string, unknown>
  const skipTrace = (results.skipTrace || results.skipTraceData) as Record<string, unknown> | undefined
  const person = (skipTrace?.person || (skipTrace?.data as Record<string, unknown>)?.person) as Record<string, unknown> | undefined
  const socialMedia = (results.socialMedia || results.socialMediaData) as Record<string, unknown> | undefined

  // Extract data arrays
  const emails = Array.isArray(person?.emails) ? person.emails : []
  const phones = Array.isArray(person?.phones) ? person.phones : []
  const addresses = Array.isArray(person?.addresses) ? person.addresses : []
  const jobs = Array.isArray(person?.jobs) ? person.jobs : []
  const socialPlatforms = socialMedia ? Object.entries(socialMedia).filter(([, v]) => v !== false) : []
  const confidenceScore = typeof results.confidenceScore === "number" ? results.confidenceScore : undefined
  const dataQuality = typeof results.dataQuality === "string" ? results.dataQuality : undefined

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
          <Link href="/reports">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Reports
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
              {report.shared ? "Unshare" : "Share"}
            </Button>
            {shareUrl && (
              <Button variant="outline" className="gap-2" onClick={handleCopyLink}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy Link"}
              </Button>
            )}
            <Button className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
              CSV
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleExportJSON}>
              JSON
            </Button>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Search Report</h1>
          <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
            <Badge variant="secondary" className="capitalize">
              {report.searchType.replace("_", " ")} Search
            </Badge>
            <span>{new Date(report.createdAt).toLocaleDateString()}</span>
            {confidenceScore != null && (
              <Badge variant={confidenceScore >= 70 ? "default" : confidenceScore >= 40 ? "secondary" : "outline"}>
                {confidenceScore}% confidence
              </Badge>
            )}
            {dataQuality && (
              <Badge variant={dataQuality === "high" ? "default" : dataQuality === "medium" ? "secondary" : "outline"}>
                {dataQuality} quality
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Search Query</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-mono">{JSON.stringify(queryObj, null, 2)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Addresses
              </CardTitle>
              <CardDescription>Found {emails.length} email addresses</CardDescription>
            </CardHeader>
            <CardContent>
              {emails.length > 0 ? (
                <div className="space-y-2">
                  {emails.map((email, idx) => {
                    const emailStr =
                      typeof email === "string"
                        ? email
                        : (email as { address?: string; email?: string })?.address ||
                          (email as { email?: string })?.email ||
                          ""
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <span className="font-mono text-sm">{emailStr}</span>
                        <Badge variant="outline">Verified</Badge>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No emails found</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Phone Numbers
              </CardTitle>
              <CardDescription>Found {phones.length} phone numbers</CardDescription>
            </CardHeader>
            <CardContent>
              {phones.length > 0 ? (
                <div className="space-y-2">
                  {phones.map((phone: unknown, idx: number) => {
                    const phoneStr =
                      typeof phone === "string"
                        ? phone
                        : (phone as { number?: string; display?: string })?.number ||
                          (phone as { display?: string })?.display ||
                          ""
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <span className="font-mono text-sm">{phoneStr}</span>
                        <Badge variant="outline">Active</Badge>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No phone numbers found</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Addresses
              </CardTitle>
              <CardDescription>Found {addresses.length} addresses</CardDescription>
            </CardHeader>
            <CardContent>
              {addresses.length > 0 ? (
                <div className="space-y-2">
                  {addresses.map((address: unknown, idx: number) => {
                    const addrStr =
                      typeof address === "string"
                        ? address
                        : (address as { display?: string; full?: string })?.display ||
                          (address as { full?: string })?.full ||
                          ""
                    return (
                      <div key={idx} className="p-3 rounded-lg bg-muted/50">
                        <p className="text-sm">{addrStr}</p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No addresses found</p>
              )}
            </CardContent>
          </Card>

          {jobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Employment History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {jobs.map((job: unknown, idx: number) => {
                    const jobObj = job as Record<string, unknown>
                    return (
                      <div key={idx} className="p-3 rounded-lg bg-muted/50">
                        <div className="font-semibold">
                          {String(jobObj.title || jobObj.position || "")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {String(jobObj.company || jobObj.organization || "")}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {socialPlatforms.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Social Media Presence
                </CardTitle>
                <CardDescription>Found on {socialPlatforms.length} platforms</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {socialPlatforms.map(([platform, data], idx) => {
                    const platformData = data as { url?: string; username?: string } | boolean
                    const url =
                      typeof platformData === "object" && platformData !== null
                        ? platformData.url
                        : undefined
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <div className="font-semibold text-sm capitalize">{platform}</div>
                          {url && <div className="text-xs text-muted-foreground">{url}</div>}
                        </div>
                        <Badge variant="default" className="text-xs">
                          Found
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  )
}
