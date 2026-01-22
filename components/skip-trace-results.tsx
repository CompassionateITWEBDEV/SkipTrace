"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, ExternalLink, User, Phone, MapPin, Mail, Building, Globe, AlertTriangle } from "lucide-react"

interface NameData {
  display?: string
  full?: string
  first?: string
  last?: string
}

interface PhoneData {
  number?: string
  display?: string
  type?: string
}

interface AddressData {
  display?: string
  street?: string
  city?: string
  state?: string
  zip?: string
  type?: string
}

interface EmailData {
  address?: string
  email?: string
}

interface JobData {
  title?: string
  position?: string
  company?: string
  organization?: string
}

interface PersonData {
  names?: (string | NameData)[]
  phones?: (string | PhoneData)[]
  addresses?: (string | AddressData)[]
  emails?: (string | EmailData)[]
  jobs?: JobData[]
  education?: unknown[]
  social_profiles?: unknown[]
  socialProfiles?: unknown[]
}

export interface SkipTraceData {
  person?: PersonData
  data?: { person?: PersonData }
  [key: string]: unknown
}

export interface SocialMediaValue {
  registered?: boolean
  username?: string | null
  url?: string | null
}

interface SkipTraceResultsProps {
  data: {
    skipTrace: SkipTraceData | null
    socialMedia: Record<string, boolean | SocialMediaValue> | null
    email: string
    searchedAt: string
  }
}

export function SkipTraceResults({ data }: SkipTraceResultsProps) {
  const { skipTrace, socialMedia, email } = data

  // Parse skip trace data
  const person = skipTrace?.person || (skipTrace?.data as { person?: PersonData })?.person || skipTrace
  const names: (string | NameData)[] = Array.isArray(person?.names) ? person.names : []
  const phones: (string | PhoneData)[] = Array.isArray(person?.phones) ? person.phones : []
  const addresses: (string | AddressData)[] = Array.isArray(person?.addresses) ? person.addresses : []
  const emails: (string | EmailData)[] = Array.isArray(person?.emails) ? person.emails : []
  const jobs: JobData[] = Array.isArray(person?.jobs) ? person.jobs : []
  const _education = person?.education || []
  const _socialProfiles = person?.social_profiles || person?.socialProfiles || []

  // Parse social media data
  const platforms = socialMedia || {}
  const foundPlatforms = Object.entries(platforms).filter(
    ([, value]) => value === true || (typeof value === "object" && value !== null),
  )

  const hasResults = names.length > 0 || phones.length > 0 || addresses.length > 0 || foundPlatforms.length > 0

  return (
    <div className="mt-6 space-y-4">
      {/* Main Results Card */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="bg-primary/5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-xl flex items-center gap-2">
              <User className="h-5 w-5" />
              Skip Trace Report
            </CardTitle>
            <Badge variant={hasResults ? "default" : "secondary"} className="text-sm">
              {hasResults ? "Records Found" : "No Records"}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{email}</span>
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
                {names.map((name, index: number) => {
                  const nameStr = typeof name === "string" ? name : (name as NameData).display || (name as NameData).full || `${(name as NameData).first} ${(name as NameData).last}`
                  return (
                    <Badge key={index} variant="outline" className="text-sm py-1 px-3">
                      {nameStr}
                    </Badge>
                  )
                })}
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
                {phones.map((phone, index: number) => {
                  const phoneData = typeof phone === "string" ? { number: phone } : (phone as PhoneData)
                  return (
                    <div key={index} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-green-600" />
                        <span className="font-mono text-sm">
                          {phoneData.number || phoneData.display}
                        </span>
                      </div>
                      {phoneData.type && (
                        <Badge variant="secondary" className="text-xs">
                          {phoneData.type}
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
                {addresses.map((addr, index: number) => {
                  const addrData = typeof addr === "string" ? { display: addr } : (addr as AddressData)
                  const addrStr = addrData.display || `${addrData.street || ""} ${addrData.city || ""}, ${addrData.state || ""} ${addrData.zip || ""}`
                  return (
                    <div key={index} className="rounded-lg border bg-card px-4 py-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">{addrStr}</p>
                          {addrData.type && <p className="text-xs text-muted-foreground">{addrData.type}</p>}
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
                {emails.map((e, index: number) => {
                  const emailStr = typeof e === "string" ? e : (e as EmailData).address || (e as EmailData).email || ""
                  return (
                    <Badge key={index} variant="outline" className="text-sm py-1 px-3 font-mono">
                      {emailStr}
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
                {jobs.map((job, index: number) => {
                  const jobData = job as JobData
                  return (
                    <div key={index} className="rounded-lg border bg-card px-4 py-3">
                      <p className="text-sm font-medium">{jobData.title || jobData.position || "Position Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{jobData.company || jobData.organization || ""}</p>
                    </div>
                  )
                })}
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
                  {typeof value === "object" && (value as SocialMediaValue)?.url && (
                    <a
                      href={(value as SocialMediaValue).url!}
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
