"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { User, MapPin, Phone, CheckCircle2 } from "lucide-react"
import { SkipTraceResults } from "./skip-trace-results"
import type { SkipTraceData, SocialMediaData } from "@/lib/types"
import { useState } from "react"

interface NameSearchCandidate {
  person: {
    names?: Array<string | { display?: string; full?: string; first?: string; last?: string }>
    addresses?: Array<string | { display?: string; city?: string; state?: string }>
    phones?: Array<string | { number?: string; display?: string }>
    emails?: Array<string | { address?: string; email?: string }>
  }
  confidence?: number
  age?: number
  location?: string
}

interface NameSearchResultsProps {
  candidates: NameSearchCandidate[]
  query: {
    firstName: string
    lastName: string
    city?: string
    state?: string
  }
  onSelectCandidate: (candidate: NameSearchCandidate) => void
}

export function NameSearchResults({ candidates, query, onSelectCandidate }: NameSearchResultsProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<NameSearchCandidate | null>(null)

  if (candidates.length === 0) {
    return null
  }

  if (candidates.length === 1) {
    // Single result - show directly
    const candidate = candidates[0]
    const person = candidate.person

    return (
      <SkipTraceResults
        data={{
          skipTrace: {
            person: person,
          } as SkipTraceData,
          socialMedia: {} as SocialMediaData,
          email: "",
          searchedAt: new Date().toISOString(),
        }}
        searchType="name"
        query={query}
      />
    )
  }

  // Multiple results - show selection interface
  if (selectedCandidate) {
    const person = selectedCandidate.person
    const names = Array.isArray(person.names) ? person.names : []
    const primaryName = names[0]
    const nameStr = typeof primaryName === "string" 
      ? primaryName 
      : primaryName?.display || primaryName?.full || `${query.firstName} ${query.lastName}`

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Selected: {nameStr}</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setSelectedCandidate(null)}>
                View All Results
              </Button>
            </div>
          </CardHeader>
        </Card>
        <SkipTraceResults
          data={{
            skipTrace: {
              person: person,
            } as SkipTraceData,
            socialMedia: {} as SocialMediaData,
            email: "",
            searchedAt: new Date().toISOString(),
          }}
          searchType="name"
          query={query}
        />
      </div>
    )
  }

  return (
    <Card className="mt-6 border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Multiple Matches Found ({candidates.length})
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          We found {candidates.length} people matching &quot;{query.firstName} {query.lastName}&quot;. Please select the correct person:
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {candidates.map((candidate, index) => {
            const person = candidate.person
            const names = Array.isArray(person.names) ? person.names : []
            const addresses = Array.isArray(person.addresses) ? person.addresses : []
            const phones = Array.isArray(person.phones) ? person.phones : []
            const primaryName = names[0]
            const nameStr = typeof primaryName === "string" 
              ? primaryName 
              : primaryName?.display || primaryName?.full || `${query.firstName} ${query.lastName}`
            
            const primaryAddress = addresses[0]
            const addressStr = typeof primaryAddress === "string"
              ? primaryAddress
              : primaryAddress?.display || (primaryAddress?.city && primaryAddress?.state 
                ? `${primaryAddress.city}, ${primaryAddress.state}` 
                : "")

            return (
              <Card key={index} className="border cursor-pointer hover:border-primary transition-colors" onClick={() => {
                setSelectedCandidate(candidate)
                onSelectCandidate(candidate)
              }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{nameStr}</span>
                        {candidate.confidence && (
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(candidate.confidence * 100)}% match
                          </Badge>
                        )}
                      </div>
                      {candidate.age && (
                        <div className="text-sm text-muted-foreground">
                          Age: ~{candidate.age}
                        </div>
                      )}
                      {addressStr && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {addressStr}
                        </div>
                      )}
                      {phones.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {typeof phones[0] === "string" ? phones[0] : phones[0]?.number || phones[0]?.display}
                        </div>
                      )}
                    </div>
                    <Button variant="outline" size="sm">
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Select
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
