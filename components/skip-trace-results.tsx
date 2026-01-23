"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, ExternalLink, User, Phone, MapPin, Mail, Building, Globe, AlertTriangle, Download, FileJson, FileText } from "lucide-react"
import { exportToCSV, exportToJSON, exportToPDF } from "@/lib/export-utils"
import type { SkipTraceData, SocialMediaData } from "@/lib/types"

interface SkipTraceResultsProps {
  data: {
    skipTrace: SkipTraceData | null
    socialMedia: SocialMediaData
    email: string
    searchedAt: string
  }
}

export function SkipTraceResults({ data }: SkipTraceResultsProps) {
  const { skipTrace, socialMedia, email } = data

  // Parse skip trace data
  const person = skipTrace?.person || skipTrace?.data?.person || skipTrace
  const names = (Array.isArray(person?.names) ? person.names : []) as Array<string | { display?: string; full?: string; first?: string; last?: string }>
  const phones = (Array.isArray(person?.phones) ? person.phones : []) as Array<string | { number?: string; display?: string; type?: string }>
  const addresses = (Array.isArray(person?.addresses) ? person.addresses : []) as Array<string | { display?: string; street?: string; city?: string; state?: string; zip?: string; type?: string }>
  const emails = (Array.isArray(person?.emails) ? person.emails : []) as Array<string | { address?: string; email?: string }>
  const jobs = (Array.isArray(person?.jobs) ? person.jobs : []) as Array<{ title?: string; position?: string; company?: string; organization?: string }>

  // Parse social media data
  const platforms = socialMedia || {}
  const foundPlatforms = Object.entries(platforms).filter(
    ([_key, value]) => value === true || (typeof value === "object" && value !== null),
  )

  const hasResults = names.length > 0 || phones.length > 0 || addresses.length > 0 || foundPlatforms.length > 0

  const handleExportCSV = () => {
    if (skipTrace && typeof skipTrace === "object") {
      exportToCSV([skipTrace as Record<string, unknown>], "skip_trace_results.csv");
    }
  };

  const handleExportJSON = () => {
    exportToJSON(skipTrace, "skip_trace_results.json");
  };

  const handleExportPDF = () => {
    if (skipTrace) {
      const htmlContent = `<h1>Skip Trace Report</h1><pre>${JSON.stringify(skipTrace, null, 2)}</pre>`
      exportToPDF(htmlContent, "skip_trace_results.pdf");
    }
  };

  return (
    <div className="mt-6 space-y-4">
      {/* Main Results Card */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="bg-primary/5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-xl flex items-center gap-2 mb-2">
                <User className="h-5 w-5" />
                Skip Trace Report
              </CardTitle>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{email}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={hasResults ? "default" : "secondary"} className="text-sm">
                {hasResults ? "Records Found" : "No Records"}
              </Badge>
              {hasResults && (
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={handleExportCSV} className="gap-1 bg-transparent">
                    <Download className="h-3 w-3" />
                    CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleExportJSON} className="gap-1 bg-transparent">
                    <FileJson className="h-3 w-3" />
                    JSON
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleExportPDF} className="gap-1 bg-transparent">
                    <FileText className="h-3 w-3" />
                    PDF
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Names Section */}
          {names.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Names Found ({names.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {names.map((name: string | { display?: string; full?: string; first?: string; last?: string }, index: number) => (
                  <Badge key={index} variant="outline" className="text-sm py-1 px-3">
                    {typeof name === "string" ? name : name.display || name.full || `${name.first || ""} ${name.last || ""}`.trim()}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Phone Numbers Section */}
          {phones.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Phone className="h-4 w-4 text-green-600" />
                Phone Numbers ({phones.length})
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {phones.map((phone: string | { number?: string; display?: string; type?: string }, index: number) => {
                  const phoneObj = typeof phone === "string" ? null : phone
                  return (
                    <div key={index} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-green-600" />
                        <span className="font-mono text-sm">
                          {typeof phone === "string" ? phone : phoneObj?.number || phoneObj?.display || ""}
                        </span>
                      </div>
                      {phoneObj?.type && (
                        <Badge variant="secondary" className="text-xs">
                          {phoneObj.type}
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Addresses Section */}
          {addresses.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                Addresses ({addresses.length})
              </h3>
              <div className="grid gap-2">
                {addresses.map((addr: string | { display?: string; street?: string; city?: string; state?: string; zip?: string; type?: string }, index: number) => {
                  const addrObj = typeof addr === "string" ? null : addr
                  return (
                    <div key={index} className="rounded-lg border bg-card px-4 py-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">
                            {typeof addr === "string"
                              ? addr
                              : addrObj?.display ||
                                `${addrObj?.street || ""} ${addrObj?.city || ""}, ${addrObj?.state || ""} ${addrObj?.zip || ""}`.trim()}
                          </p>
                          {addrObj?.type && <p className="text-xs text-muted-foreground">{addrObj.type}</p>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Emails Section */}
          {emails.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Mail className="h-4 w-4 text-orange-600" />
                Email Addresses ({emails.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {emails.map((e: string | { address?: string; email?: string }, index: number) => {
                  const emailObj = typeof e === "string" ? null : e
                  return (
                    <Badge key={index} variant="outline" className="text-sm py-1 px-3 font-mono">
                      {typeof e === "string" ? e : emailObj?.address || emailObj?.email || ""}
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}

          {/* Jobs Section */}
          {jobs.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Building className="h-4 w-4 text-purple-600" />
                Employment History ({jobs.length})
              </h3>
              <div className="grid gap-2">
                {jobs.map((job: { title?: string; position?: string; company?: string; organization?: string }, index: number) => (
                  <div key={index} className="rounded-lg border bg-card px-4 py-3">
                    <p className="text-sm font-medium">{job.title || job.position || "Position Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{job.company || job.organization || ""}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Social Media Results Card */}
      {foundPlatforms.length > 0 && (
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Social Media Presence
              </CardTitle>
              <Badge className="text-sm">{foundPlatforms.length} Platforms</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {foundPlatforms.map(([platform, value]) => (
                <div
                  key={platform}
                  className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-sm capitalize">{platform.replace(/_/g, " ")}</span>
                  </div>
                  {typeof value === "object" && value !== null && "url" in value && typeof value.url === "string" && (
                    <a
                      href={value.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results Message */}
      {!hasResults && (
        <Card className="border-2 border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30">
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Records Found</h3>
            <p className="text-sm text-muted-foreground">
              No information was found for this email address in our database.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Raw Data Debug (for development) */}
      {skipTrace && Object.keys(skipTrace).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Raw API Response</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-60">
              {JSON.stringify(skipTrace, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
