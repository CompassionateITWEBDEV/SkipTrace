"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, User, Phone, Mail, Building, Home, Calendar, DollarSign, Search, Ruler, Bed, Bath, ArrowLeft, CheckCircle2 } from "lucide-react"
import Link from "next/link"

interface Resident {
  name?: string
  phone?: string
  email?: string
  age?: number | string
}

interface PropertyInfo {
  address: string
  type: string
  county?: string
  estimatedValue?: string | number
  owner?: string
  lastSaleDate?: string
  yearBuilt?: string | number
  squareFeet?: string | number
  bedrooms?: number
  bathrooms?: number
}

interface AddressSearchResultsProps {
  data: {
    query: {
      street: string
      city?: string
      state?: string
      zip?: string
      fullAddress: string
    }
    residents?: Resident[]
    propertyInfo: PropertyInfo
    instructions?: string | null
    searchPerformed: string
  }
}

export function AddressSearchResults({ data }: AddressSearchResultsProps) {
  const { query, residents, propertyInfo, instructions } = data
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null)
  const hasResidents = residents && residents.length > 0
  const hasPropertyInfo = propertyInfo && (propertyInfo.owner || propertyInfo.estimatedValue || propertyInfo.lastSaleDate)
  const multipleResidents = hasResidents && residents!.length > 1

  // Helper to create search links
  const createSearchLink = (type: "name" | "email" | "phone", value: string) => {
    if (type === "name") {
      const nameParts = value.trim().split(/\s+/)
      if (nameParts.length >= 2) {
        return `/?tab=name&firstName=${encodeURIComponent(nameParts[0])}&lastName=${encodeURIComponent(nameParts.slice(1).join(" "))}`
      }
      return `/?tab=name&firstName=${encodeURIComponent(value)}`
    }
    if (type === "email") {
      return `/?tab=email&email=${encodeURIComponent(value)}`
    }
    if (type === "phone") {
      return `/?tab=phone&phone=${encodeURIComponent(value)}`
    }
    return "#"
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Main Address Results Card */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="bg-primary/5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-xl flex items-center gap-2 mb-2">
                <MapPin className="h-5 w-5" />
                Address Search Report
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {query.fullAddress}
              </CardDescription>
            </div>
            <Badge variant={hasResidents || hasPropertyInfo ? "default" : "secondary"} className="text-sm">
              {hasResidents ? `${residents.length} Resident${residents.length > 1 ? "s" : ""} Found` : hasPropertyInfo ? "Property Found" : "No Data"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Property Information Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Home className="h-4 w-4 text-blue-600" />
              Property Information
            </h3>
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <Building className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Property Type</p>
                    <p className="text-sm font-medium">{propertyInfo.type || "Residential"}</p>
                  </div>
                </div>
                {propertyInfo.county && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">County</p>
                      <p className="text-sm font-medium">{propertyInfo.county}</p>
                    </div>
                  </div>
                )}
                {propertyInfo.owner && (
                  <div className="flex items-start gap-2 sm:col-span-2">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Property Owner</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{propertyInfo.owner}</p>
                        <Link href={createSearchLink("name", propertyInfo.owner)}>
                          <Button size="sm" variant="ghost" className="h-6 px-2">
                            <Search className="h-3 w-3 mr-1" />
                            Search
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
                {propertyInfo.estimatedValue && (
                  <div className="flex items-start gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Estimated Value</p>
                      <p className="text-sm font-medium">
                        {typeof propertyInfo.estimatedValue === "number"
                          ? `$${propertyInfo.estimatedValue.toLocaleString()}`
                          : propertyInfo.estimatedValue}
                      </p>
                    </div>
                  </div>
                )}
                {propertyInfo.lastSaleDate && (
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Last Sale Date</p>
                      <p className="text-sm font-medium">{propertyInfo.lastSaleDate}</p>
                    </div>
                  </div>
                )}
                {propertyInfo.yearBuilt && (
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Year Built</p>
                      <p className="text-sm font-medium">{propertyInfo.yearBuilt}</p>
                    </div>
                  </div>
                )}
                {propertyInfo.squareFeet && (
                  <div className="flex items-start gap-2">
                    <Ruler className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Square Feet</p>
                      <p className="text-sm font-medium">
                        {typeof propertyInfo.squareFeet === "number"
                          ? propertyInfo.squareFeet.toLocaleString()
                          : propertyInfo.squareFeet}
                      </p>
                    </div>
                  </div>
                )}
                {(propertyInfo.bedrooms || propertyInfo.bathrooms) && (
                  <div className="flex items-start gap-2 sm:col-span-2">
                    <div className="flex items-center gap-4">
                      {propertyInfo.bedrooms && (
                        <div className="flex items-center gap-1">
                          <Bed className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{propertyInfo.bedrooms} bed{propertyInfo.bedrooms !== 1 ? "s" : ""}</span>
                        </div>
                      )}
                      {propertyInfo.bathrooms && (
                        <div className="flex items-center gap-1">
                          <Bath className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{propertyInfo.bathrooms} bath{propertyInfo.bathrooms !== 1 ? "s" : ""}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Residents Section */}
          {hasResidents && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Associated Residents ({residents.length})
              </h3>
              {multipleResidents && selectedResident ? (
                <div className="space-y-4">
                  <Card className="border-2 border-primary/30">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          Selected: {selectedResident.name || "Resident"}
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedResident(null)}
                        >
                          <ArrowLeft className="h-4 w-4 mr-1" />
                          View All Residents
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-4">
                      {selectedResident.name && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-primary" />
                            <p className="font-medium">{selectedResident.name}</p>
                          </div>
                          <Link href={createSearchLink("name", selectedResident.name)}>
                            <Button size="sm" variant="outline" className="h-8">
                              <Search className="h-3 w-3 mr-1" />
                              Search this person
                            </Button>
                          </Link>
                        </div>
                      )}
                      {selectedResident.phone && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-green-600" />
                            <span className="font-mono">{selectedResident.phone}</span>
                          </div>
                          <Link href={createSearchLink("phone", selectedResident.phone)}>
                            <Button size="sm" variant="outline" className="h-8">
                              <Search className="h-3 w-3 mr-1" />
                              Search
                            </Button>
                          </Link>
                        </div>
                      )}
                      {selectedResident.email && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-orange-600" />
                            <span className="font-mono">{selectedResident.email}</span>
                          </div>
                          <Link href={createSearchLink("email", selectedResident.email)}>
                            <Button size="sm" variant="outline" className="h-8">
                              <Search className="h-3 w-3 mr-1" />
                              Search
                            </Button>
                          </Link>
                        </div>
                      )}
                      {selectedResident.age && (
                        <p className="text-sm text-muted-foreground">Age: {selectedResident.age}</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : multipleResidents ? (
                <>
                  <p className="text-sm text-muted-foreground mb-3">
                    We found {residents.length} residents at this address. Please select one to view details:
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {residents.map((resident, index) => (
                      <Card
                        key={index}
                        className="border cursor-pointer hover:border-primary transition-colors"
                        onClick={() => setSelectedResident(resident)}
                      >
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <User className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-medium text-sm truncate">
                              {resident.name || resident.email || resident.phone || `Resident ${index + 1}`}
                            </span>
                            {resident.age && (
                              <span className="text-xs text-muted-foreground">(~{resident.age})</span>
                            )}
                          </div>
                          <Button variant="outline" size="sm" className="shrink-0" onClick={(e) => { e.stopPropagation(); setSelectedResident(resident) }}>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Select
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {residents.map((resident, index) => (
                    <Card key={index} className="border">
                      <CardContent className="p-4 space-y-3">
                        {resident.name && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-primary" />
                              <p className="font-medium text-sm">{resident.name}</p>
                            </div>
                            <Link href={createSearchLink("name", resident.name)}>
                              <Button size="sm" variant="ghost" className="h-7 px-2">
                                <Search className="h-3 w-3 mr-1" />
                                Search
                              </Button>
                            </Link>
                          </div>
                        )}
                        {resident.phone && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-mono">{resident.phone}</span>
                            </div>
                            <Link href={createSearchLink("phone", resident.phone)}>
                              <Button size="sm" variant="ghost" className="h-7 px-2">
                                <Search className="h-3 w-3 mr-1" />
                                Search
                              </Button>
                            </Link>
                          </div>
                        )}
                        {resident.email && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-orange-600" />
                              <span className="text-sm font-mono">{resident.email}</span>
                            </div>
                            <Link href={createSearchLink("email", resident.email)}>
                              <Button size="sm" variant="ghost" className="h-7 px-2">
                                <Search className="h-3 w-3 mr-1" />
                                Search
                              </Button>
                            </Link>
                          </div>
                        )}
                        {resident.age && (
                          <p className="text-xs text-muted-foreground">Age: {resident.age}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Instructions/No Data Message */}
          {instructions && !hasResidents && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30 p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">{instructions}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/?tab=name">
                  <Button size="sm" variant="outline" className="text-xs">
                    Search by Name
                  </Button>
                </Link>
                <Link href="/?tab=email">
                  <Button size="sm" variant="outline" className="text-xs">
                    Search by Email
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
