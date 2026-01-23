"use client"

import { useState, Suspense } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Mail, Phone, User, MapPin, Loader2, AlertTriangle, Eye } from "lucide-react"
import { PhoneValidationResult } from "./phone-validation-result"
import { SkipTraceResults } from "./skip-trace-results"
import type { SkipTraceData, SocialMediaData } from "@/lib/types"

interface PhoneValidationData {
  phoneNumber: string
  isValid: boolean
  isVirtual: boolean
  isDisposable: boolean
  riskScore: number
  carrier: string
  lineType: string
  country: string
  warnings: string[]
  lastSeen: string | null
}

export function SearchSection() {
  const [emailQuery, setEmailQuery] = useState("")
  const [phoneQuery, setPhoneQuery] = useState("")
  const [nameFirst, setNameFirst] = useState("")
  const [nameLast, setNameLast] = useState("")
  const [nameCity, setNameCity] = useState("")
  const [nameState, setNameState] = useState("")
  const [addressQuery, setAddressQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  const [skipTraceResults, setSkipTraceResults] = useState<{ skipTrace?: unknown; socialMedia?: Record<string, unknown>; searchedAt?: string } | null>(null)
  const [phoneSearchResults, setPhoneSearchResults] = useState<{ skipTraceData?: unknown; searchPerformed?: string } | null>(null)
  const [phoneValidationResult, setPhoneValidationResult] = useState<PhoneValidationData | null>(null)
  const [monitoringData, setMonitoringData] = useState<{ services?: Array<{ name?: string; description?: string; contact?: string }> } | null>(null)
  const [nameSearchResults, setNameSearchResults] = useState<{ skipTraceData?: unknown; socialData?: { platforms?: Array<{ platform?: string; url?: string; username?: string }> }; possibleEmails?: string[]; searchPerformed?: string } | null>(null)
  const [addressSearchResults, setAddressSearchResults] = useState<{ query?: { fullAddress?: string }; propertyInfo?: { type?: string; county?: string }; instructions?: string } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [consentChecked, setConsentChecked] = useState(false)

  const handleEmailSearch = async () => {
    if (!emailQuery) return

    setIsSearching(true)
    setSkipTraceResults(null)
    setErrorMessage("")

    try {
      const response = await fetch("/api/skip-trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailQuery }),
      })

      if (response.ok) {
        const data = await response.json()
        setSkipTraceResults(data)
      } else {
        const errorData = await response.json()
        setErrorMessage(errorData.error || "Failed to perform skip trace")
      }
    } catch (error) {
      console.error("Skip trace failed:", error)
      setErrorMessage("An error occurred while searching")
    } finally {
      setIsSearching(false)
    }
  }

  const handlePhoneSearch = async () => {
    if (!phoneQuery) return

    let cleanedPhone = phoneQuery.replace(/[\s\-().]/g, "")

    if (!/^\+?\d{10,15}$/.test(cleanedPhone)) {
      setErrorMessage("Please enter a valid phone number (10-15 digits). Example: +14155551234 or 4155551234")
      return
    }

    if (!cleanedPhone.startsWith("+")) {
      if (cleanedPhone.length === 10) {
        cleanedPhone = "+1" + cleanedPhone
      } else {
        cleanedPhone = "+" + cleanedPhone
      }
    }

    setIsSearching(true)
    setPhoneSearchResults(null)
    setPhoneValidationResult(null)
    setErrorMessage("")

    try {
      const response = await fetch("/api/search-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanedPhone }),
      })

      if (response.ok) {
        const data = await response.json()
        setPhoneSearchResults(data)
        // Also set validation result if available
        if (data.virtualCheck) {
          const warnings: string[] = []
          const isVirtual = data.virtualCheck.is_virtual || data.virtualCheck.isVirtual || false
          const isDisposable = data.virtualCheck.is_disposable || data.virtualCheck.isDisposable || false
          
          if (isVirtual) warnings.push("This is a virtual phone number")
          if (isDisposable) warnings.push("This is a disposable phone number")
          
          setPhoneValidationResult({
            phoneNumber: cleanedPhone,
            isValid: !isVirtual && !isDisposable,
            isVirtual,
            isDisposable,
            riskScore: data.virtualCheck.risk_score || data.virtualCheck.riskScore || (isVirtual || isDisposable ? 70 : 20),
            carrier: data.virtualCheck.carrier || "Unknown",
            lineType: data.virtualCheck.line_type || data.virtualCheck.lineType || "Unknown",
            country: data.virtualCheck.country || "Unknown",
            warnings,
            lastSeen: data.virtualCheck.last_seen || data.virtualCheck.lastSeen || null,
          })
        }
      } else {
        const errorData = await response.json()
        setErrorMessage(errorData.error || "Failed to search phone")
      }
    } catch (error) {
      console.error("Phone search failed:", error)
      setErrorMessage("An error occurred while searching")
    } finally {
      setIsSearching(false)
    }
  }

  const handleNameSearch = async () => {
    if (!nameFirst && !nameLast) return

    setIsSearching(true)
    setNameSearchResults(null)
    setErrorMessage("")

    try {
      const response = await fetch("/api/search-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: nameFirst,
          lastName: nameLast,
          city: nameCity,
          state: nameState,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setNameSearchResults(data)
      } else {
        const errorData = await response.json()
        setErrorMessage(errorData.error || "Failed to search by name")
      }
    } catch (error) {
      console.error("Name search failed:", error)
      setErrorMessage("An error occurred while searching")
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddressSearch = async () => {
    if (!addressQuery) return

    setIsSearching(true)
    setAddressSearchResults(null)
    setErrorMessage("")

    try {
      const parts = addressQuery.split(",").map((p) => p.trim())
      const response = await fetch("/api/search-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          street: parts[0] || addressQuery,
          city: parts[1] || "",
          state: parts[2] || "",
          zip: parts[3] || "",
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setAddressSearchResults(data)
      } else {
        const errorData = await response.json()
        setErrorMessage(errorData.error || "Failed to search address")
      }
    } catch (error) {
      console.error("Address search failed:", error)
      setErrorMessage("An error occurred while searching")
    } finally {
      setIsSearching(false)
    }
  }

  const handleMonitoring = async () => {
    if (!consentChecked) {
      setErrorMessage("You must confirm legal authorization to proceed")
      return
    }

    setIsSearching(true)
    setMonitoringData(null)
    setErrorMessage("")

    try {
      const response = await fetch("/api/relationship-monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true }),
      })

      if (response.ok) {
        const data = await response.json()
        setMonitoringData(data)
      } else {
        const errorData = await response.json()
        setErrorMessage(errorData.error || "Failed to access monitoring service")
      }
    } catch (error) {
      console.error("Monitoring request failed:", error)
      setErrorMessage("An error occurred")
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <section id="search" className="py-16 px-4 bg-muted/30">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <Badge variant="secondary" className="mb-4">
            Powerful Search Tools
          </Badge>
          <h2 className="text-3xl font-bold mb-4">Find Anyone, Anywhere</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Search across billions of records using email, phone, name, or address. Get instant results with detailed
            contact information.
          </p>
        </div>

        <Card className="border-2 shadow-lg">
          <CardContent className="p-6">
            {errorMessage && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <Suspense fallback={<div>Loading...</div>}>
              <Tabs defaultValue="email" className="w-full">
                <TabsList className="grid w-full grid-cols-5 mb-6">
                  <TabsTrigger value="email" className="flex items-center gap-1 text-xs sm:text-sm">
                    <Mail className="h-4 w-4" />
                    <span className="hidden sm:inline">Email</span>
                  </TabsTrigger>
                  <TabsTrigger value="phone" className="flex items-center gap-1 text-xs sm:text-sm">
                    <Phone className="h-4 w-4" />
                    <span className="hidden sm:inline">Phone</span>
                  </TabsTrigger>
                  <TabsTrigger value="name" className="flex items-center gap-1 text-xs sm:text-sm">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Name</span>
                  </TabsTrigger>
                  <TabsTrigger value="address" className="flex items-center gap-1 text-xs sm:text-sm">
                    <MapPin className="h-4 w-4" />
                    <span className="hidden sm:inline">Address</span>
                  </TabsTrigger>
                  <TabsTrigger value="monitor" className="flex items-center gap-1 text-xs sm:text-sm">
                    <Eye className="h-4 w-4" />
                    <span className="hidden sm:inline">Monitor</span>
                  </TabsTrigger>
                </TabsList>

                {/* Email Search Tab */}
                <TabsContent value="email">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Email Skip Trace</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Search across 48+ social media platforms and public records to find information linked to any
                        email address.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input
                        id="email-search"
                        name="email"
                        type="email"
                        placeholder="Enter email address..."
                        className="h-12 flex-1"
                        value={emailQuery}
                        onChange={(e) => setEmailQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleEmailSearch()}
                      />
                      <Button
                        size="lg"
                        className="h-12 px-8"
                        onClick={handleEmailSearch}
                        disabled={isSearching || !emailQuery}
                      >
                        {isSearching ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <Search className="mr-2 h-4 w-4" />
                            Search
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  {skipTraceResults && (
                    <SkipTraceResults
                      data={{
                        skipTrace: (skipTraceResults.skipTrace as SkipTraceData | null) || null,
                        socialMedia: (skipTraceResults.socialMedia as SocialMediaData) || {},
                        email: emailQuery,
                        searchedAt: skipTraceResults.searchedAt || new Date().toISOString(),
                      }}
                    />
                  )}
                </TabsContent>

                {/* Phone Search Tab - Updated to show skip trace results */}
                <TabsContent value="phone">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Phone Skip Trace & Validation</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Find the owner of any phone number and detect virtual/disposable numbers.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input
                        id="phone-search"
                        name="phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567 or 5551234567"
                        className="h-12 flex-1 font-mono"
                        value={phoneQuery}
                        onChange={(e) => setPhoneQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handlePhoneSearch()}
                      />
                      <Button
                        size="lg"
                        className="h-12 px-8"
                        onClick={handlePhoneSearch}
                        disabled={isSearching || !phoneQuery}
                      >
                        {isSearching ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <Search className="mr-2 h-4 w-4" />
                            Search
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter phone in international format with country code. US numbers: +1 followed by 10 digits.
                    </p>
                  </div>
                  {phoneValidationResult && <PhoneValidationResult data={phoneValidationResult} />}
                  {phoneSearchResults?.skipTraceData ? (
                    <SkipTraceResults
                      data={{
                        skipTrace: (phoneSearchResults.skipTraceData as SkipTraceData) || null,
                        socialMedia: {},
                        email: "",
                        searchedAt: phoneSearchResults.searchPerformed || new Date().toISOString(),
                      }}
                    />
                  ) : null}
                </TabsContent>

                {/* Name Search Tab - Updated to show skip trace results */}
                <TabsContent value="name">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Name Skip Trace</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Find contact information, social media, and addresses for any person by name.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        id="name-first"
                        name="firstName"
                        placeholder="First Name"
                        className="h-12"
                        value={nameFirst}
                        onChange={(e) => setNameFirst(e.target.value)}
                      />
                      <Input
                        id="name-last"
                        name="lastName"
                        placeholder="Last Name"
                        className="h-12"
                        value={nameLast}
                        onChange={(e) => setNameLast(e.target.value)}
                      />
                      <Input
                        id="name-city"
                        name="city"
                        placeholder="City (optional)..."
                        className="h-12"
                        value={nameCity}
                        onChange={(e) => setNameCity(e.target.value)}
                      />
                      <Input
                        id="name-state"
                        name="state"
                        placeholder="State (optional)..."
                        className="h-12"
                        value={nameState}
                        onChange={(e) => setNameState(e.target.value)}
                      />
                    </div>
                    <Button
                      size="lg"
                      className="w-full h-12"
                      onClick={handleNameSearch}
                      disabled={isSearching || (!nameFirst && !nameLast)}
                    >
                      {isSearching ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4" />
                          Search by Name
                        </>
                      )}
                    </Button>
                  </div>
                  {nameSearchResults && (
                    <>
                      {nameSearchResults.skipTraceData ? (
                        <SkipTraceResults
                          data={{
                            skipTrace: (nameSearchResults.skipTraceData as SkipTraceData) || null,
                            socialMedia:
                              nameSearchResults.socialData?.platforms?.reduce((acc: Record<string, { registered: boolean; url?: string; username?: string }>, p: { platform?: string; url?: string; username?: string }) => {
                                if (p.platform) {
                                  acc[p.platform] = { registered: true, url: p.url, username: p.username }
                                }
                                return acc
                              }, {}) || {},
                            email: nameSearchResults.possibleEmails?.[0] || "",
                            searchedAt: nameSearchResults.searchPerformed || new Date().toISOString(),
                          }}
                        />
                      ) : (
                        <Card className="mt-6 border-2">
                          <CardHeader>
                            <CardTitle className="text-lg">
                              Search Results for {nameFirst} {nameLast}
                            </CardTitle>
                            <CardDescription>
                              Location: {nameCity || "All"}, {nameState || "All"}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {nameSearchResults.socialData?.platforms && nameSearchResults.socialData.platforms.length > 0 ? (
                              <div className="space-y-4">
                                <h4 className="font-semibold text-sm">Social Media Found:</h4>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {nameSearchResults.socialData.platforms.map((platform: { platform?: string; url?: string; username?: string }, index: number) => (
                                    <div
                                      key={index}
                                      className="flex items-center justify-between rounded-lg border bg-green-50 dark:bg-green-950/30 px-4 py-3"
                                    >
                                      <span className="font-medium text-sm capitalize">{platform.platform || ""}</span>
                                      {platform.url && (
                                        <a
                                          href={platform.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary hover:underline text-xs"
                                        >
                                          View Profile
                                        </a>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                {nameSearchResults.possibleEmails && (
                                  <div className="mt-4">
                                    <h4 className="font-semibold text-sm mb-2">Possible Emails:</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {nameSearchResults.possibleEmails.map((email: string, index: number) => (
                                        <Badge key={index} variant="outline" className="font-mono text-xs">
                                          {email}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-muted-foreground">
                                No results found. Try searching with a more specific name or location.
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </TabsContent>

                {/* Address Search Tab */}
                <TabsContent value="address">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Address Lookup</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Find residents and property information for any address.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input
                        id="address-search"
                        name="address"
                        placeholder="Enter full address (123 Main St, City, State, ZIP)..."
                        className="h-12 flex-1"
                        value={addressQuery}
                        onChange={(e) => setAddressQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddressSearch()}
                      />
                      <Button
                        size="lg"
                        className="h-12 px-8"
                        onClick={handleAddressSearch}
                        disabled={isSearching || !addressQuery}
                      >
                        {isSearching ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <MapPin className="mr-2 h-4 w-4" />
                            Search
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  {addressSearchResults && (
                    <Card className="mt-6 border-2">
                      <CardHeader>
                        <CardTitle className="text-lg">Address Search Results</CardTitle>
                        <CardDescription>{addressSearchResults.query?.fullAddress || addressQuery}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="p-4 border rounded-lg">
                            <p className="font-semibold">Property Information</p>
                            <p className="text-sm text-muted-foreground">
                              Type: {addressSearchResults.propertyInfo?.type || "Residential"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              County: {addressSearchResults.propertyInfo?.county || "N/A"}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {addressSearchResults.instructions ||
                              "To find residents, search by their name in the Name tab."}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Monitor Tab */}
                <TabsContent value="monitor">
                  <div className="space-y-4">
                    <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                        <strong>Legal Notice:</strong> This service requires proper consent and legal authorization.
                        Unauthorized surveillance is illegal and punishable by law.
                      </AlertDescription>
                    </Alert>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Digital Forensics & Monitoring</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Professional surveillance and digital forensics services for legal investigations.
                      </p>
                    </div>
                    <div className="flex items-start space-x-2 mb-4">
                      <Checkbox
                        id="consent"
                        checked={consentChecked}
                        onCheckedChange={(checked) => setConsentChecked(checked as boolean)}
                      />
                      <label htmlFor="consent" className="text-sm text-muted-foreground leading-tight">
                        I confirm that I have legal authorization to access this information and understand that
                        unauthorized use is illegal.
                      </label>
                    </div>
                    <Button
                      size="lg"
                      className="w-full h-12"
                      onClick={handleMonitoring}
                      disabled={isSearching || !consentChecked}
                    >
                      {isSearching ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Eye className="mr-2 h-4 w-4" />
                          Access Monitoring Services
                        </>
                      )}
                    </Button>
                  </div>
                  {monitoringData && (
                    <Card className="mt-6 border-2">
                      <CardHeader>
                        <CardTitle className="text-lg">Monitoring Services</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {monitoringData.services ? (
                          <div className="space-y-4">
                            {monitoringData.services.map((service: { name?: string; description?: string; contact?: string }, index: number) => (
                              <div key={index} className="p-4 border rounded-lg">
                                <p className="font-semibold">{service.name}</p>
                                <p className="text-sm text-muted-foreground">{service.description}</p>
                                {service.contact && (
                                  <p className="text-sm text-primary mt-2">Contact: {service.contact}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-60">
                            {JSON.stringify(monitoringData, null, 2)}
                          </pre>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
