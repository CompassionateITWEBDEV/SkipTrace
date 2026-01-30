"use client"

import { useState, Suspense } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Mail, Phone, User, MapPin, Loader2, AlertTriangle, Eye, Bell, CheckCircle2, ExternalLink } from "lucide-react"
import { PhoneValidationResult } from "./phone-validation-result"
import { SkipTraceResults } from "./skip-trace-results"
import { AddressSearchResults } from "./address-search-results"
import { NameSearchResults } from "./name-search-results"
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
  const [nameMiddle, setNameMiddle] = useState("")
  const [nameCity, setNameCity] = useState("")
  const [nameState, setNameState] = useState("")
  const [nameAge, setNameAge] = useState("")
  const [nameDOB, setNameDOB] = useState("")
  const [addressQuery, setAddressQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  const [skipTraceResults, setSkipTraceResults] = useState<{ skipTrace?: unknown; socialMedia?: Record<string, unknown>; searchedAt?: string } | null>(null)
  const [phoneSearchResults, setPhoneSearchResults] = useState<{ skipTraceData?: unknown; searchPerformed?: string } | null>(null)
  const [phoneValidationResult, setPhoneValidationResult] = useState<PhoneValidationData | null>(null)
  const [monitoringData, setMonitoringData] = useState<{ services?: Array<{ name?: string; description?: string; contact?: string }> } | null>(null)
  const [nameSearchResults, setNameSearchResults] = useState<{ skipTraceData?: unknown; multipleResults?: Array<{ person: unknown; confidence?: number; age?: number; location?: string }>; socialData?: { platforms?: Array<{ platform?: string; url?: string; username?: string }> }; possibleEmails?: string[]; searchPerformed?: string } | null>(null)
  const [addressSearchResults, setAddressSearchResults] = useState<{
    query?: { street?: string; city?: string; state?: string; zip?: string; fullAddress?: string }
    propertyInfo?: { address?: string; type?: string; county?: string; estimatedValue?: string | number; owner?: string; lastSaleDate?: string }
    instructions?: string
    residents?: Array<{ name?: string; phone?: string; email?: string; age?: number | string }>
    skipTraceData?: unknown
    searchPerformed?: string
  } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [consentChecked, setConsentChecked] = useState(false)
  const [creatingSubscription, setCreatingSubscription] = useState(false)
  const [subscriptionSuccess, setSubscriptionSuccess] = useState<string | null>(null)

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
        // Check if we actually got results
        if (!data.skipTrace && !data.socialMedia) {
          setErrorMessage("INFO: No records found for this email address. Try searching by name or phone number instead.")
        } else {
          setSkipTraceResults(data)
          // Optionally save as report
          try {
            await fetch("/api/reports", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: `Email Search: ${emailQuery}`,
                query: JSON.stringify({ email: emailQuery }),
                results: data,
                searchType: "EMAIL",
              }),
            })
          } catch (err) {
            // Silently fail - report saving is optional
            console.error("Failed to save report:", err)
          }
        }
      } else {
        const errorData = await response.json()
        // Differentiate between "not found" (404) and actual errors
        if (response.status === 404 || errorData.error?.toLowerCase().includes("not found")) {
          setErrorMessage("INFO: No records found for this email address. Try searching by name or phone number instead.")
        } else if (response.status === 429) {
          setErrorMessage("ERROR: Rate limit exceeded. Please try again later or upgrade your plan for higher limits.")
        } else {
          setErrorMessage(`ERROR: ${errorData.error || "Failed to perform skip trace. Please try again."}`)
        }
      }
    } catch (error) {
      console.error("Skip trace failed:", error)
      setErrorMessage("Network error occurred. Please check your connection and try again.")
    } finally {
      setIsSearching(false)
    }
  }

  const applyPhoneSearchResult = (
    data: { skipTraceData?: unknown; virtualCheck?: Record<string, unknown>; searchPerformed?: string; warning?: string | null },
    cleanedPhone: string,
  ) => {
    setPhoneSearchResults(data)
    const v = data.virtualCheck
    if (v) {
      const warnings: string[] = []
      const isVirtual = !!v.is_virtual || !!v.isVirtual
      const isDisposable = !!v.is_disposable || !!v.isDisposable
      if (isVirtual) warnings.push("This is a virtual phone number")
      if (isDisposable) warnings.push("This is a disposable phone number")
      setPhoneValidationResult({
        phoneNumber: cleanedPhone,
        isValid: !isVirtual && !isDisposable,
        isVirtual,
        isDisposable,
        riskScore: Number(v.risk_score ?? v.riskScore) || (isVirtual || isDisposable ? 70 : 20),
        carrier: (v.carrier as string) || "Unknown",
        lineType: ((v.line_type ?? v.lineType) as string) || "Unknown",
        country: (v.country as string) || "Unknown",
        warnings,
        lastSeen: ((v.last_seen ?? v.lastSeen) as string | null) ?? null,
      })
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
      // First attempt (may use cache)
      let response = await fetch("/api/search-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanedPhone }),
      })

      let data = response.ok ? await response.json() : null

      // If we got 200 but no useful data (e.g. cached empty result), retry once with skipCache
      if (response.ok && data && !data.skipTraceData && !data.virtualCheck) {
        response = await fetch("/api/search-phone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: cleanedPhone, skipCache: true }),
        })
        if (response.ok) data = await response.json()
      }

      if (response.ok && data) {
        applyPhoneSearchResult(data, cleanedPhone)
      } else {
        const errorData = response.ok ? data : await response.json().catch(() => ({}))
        if (response.status === 404 || errorData?.error?.toLowerCase().includes("not found")) {
          setErrorMessage("INFO: No records found for this phone number. Try searching by email or name instead.")
        } else if (response.status === 429) {
          setErrorMessage("ERROR: Rate limit exceeded. Please try again later or upgrade your plan for higher limits.")
        } else {
          setErrorMessage(`ERROR: ${errorData?.error || "Failed to search phone. Please try again."}`)
        }
      }
    } catch (error) {
      console.error("Phone search failed:", error)
      setErrorMessage("Network error occurred. Please check your connection and try again.")
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
          middleName: nameMiddle || undefined,
          city: nameCity || undefined,
          state: nameState || undefined,
          age: nameAge ? parseInt(nameAge) : undefined,
          dateOfBirth: nameDOB || undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setNameSearchResults(data)
      } else {
        const errorData = await response.json()
        // Differentiate between "not found" and actual errors
        if (response.status === 404 || errorData.error?.toLowerCase().includes("not found")) {
          setErrorMessage("INFO: No records found for this name. Try adding city/state filters or search by email/phone instead.")
        } else if (response.status === 429) {
          setErrorMessage("ERROR: Rate limit exceeded. Please try again later or upgrade your plan for higher limits.")
        } else {
          setErrorMessage(`ERROR: ${errorData.error || "Failed to search by name. Please try again."}`)
        }
      }
    } catch (error) {
      console.error("Name search failed:", error)
      setErrorMessage("Network error occurred. Please check your connection and try again.")
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
        // Check if we got any results
        if (!data.skipTraceData && !data.residents) {
          setErrorMessage("INFO: No records found for this address. Try searching by name or email instead.")
        } else {
          setAddressSearchResults(data)
        }
      } else {
        const errorData = await response.json()
        // Differentiate between "not found" and actual errors
        if (response.status === 404 || errorData.error?.toLowerCase().includes("not found")) {
          setErrorMessage("INFO: No records found for this address. Try searching by name or email instead.")
        } else if (response.status === 429) {
          setErrorMessage("ERROR: Rate limit exceeded. Please try again later or upgrade your plan for higher limits.")
        } else {
          setErrorMessage(`ERROR: ${errorData.error || "Failed to search address. Please try again."}`)
        }
      }
    } catch (error) {
      console.error("Address search failed:", error)
      setErrorMessage("Network error occurred. Please check your connection and try again.")
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
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json()
          setMonitoringData(data)
        } else {
          // Handle non-JSON response
          const text = await response.text()
          console.error("Unexpected response format:", text)
          setErrorMessage("Invalid response from monitoring service")
        }
      } else {
        // Handle error response
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json()
          setErrorMessage(errorData.error || "Failed to access monitoring service")
        } else {
          // Handle non-JSON error response
          const statusText = response.statusText || `Error ${response.status}`
          setErrorMessage(statusText || "Failed to access monitoring service")
        }
      }
    } catch (error) {
      console.error("Monitoring request failed:", error)
      setErrorMessage(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsSearching(false)
    }
  }

  const handleCreateSubscription = async (targetType: "email" | "phone" | "name", targetValue: string, frequency = "weekly") => {
    if (!consentChecked) {
      setErrorMessage("You must confirm legal authorization to create monitoring subscriptions")
      return
    }

    setCreatingSubscription(true)
    setSubscriptionSuccess(null)
    setErrorMessage("")

    try {
      const response = await fetch("/api/relationship-monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consent: true,
          targetType,
          targetValue,
          frequency,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.subscription) {
          setSubscriptionSuccess(`Monitoring subscription created for ${targetType}: ${targetValue}`)
          // Clear success message after 5 seconds
          setTimeout(() => setSubscriptionSuccess(null), 5000)
        } else {
          setErrorMessage("Failed to create subscription. Please try again or visit the monitoring dashboard.")
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        setErrorMessage(errorData.error || "Failed to create monitoring subscription")
      }
    } catch (error) {
      console.error("Subscription creation failed:", error)
      setErrorMessage(error instanceof Error ? error.message : "An error occurred while creating subscription")
    } finally {
      setCreatingSubscription(false)
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
              <Alert variant={errorMessage.startsWith("ERROR:") ? "destructive" : errorMessage.startsWith("INFO:") ? "default" : "destructive"} className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {errorMessage.replace(/^(ERROR|INFO):\s*/, "")}
                  {errorMessage.startsWith("INFO:") && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      💡 Tip: Try different search methods or check your input for typos.
                    </div>
                  )}
                </AlertDescription>
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
                        autoComplete="email"
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
                    <>
                      <SkipTraceResults
                        data={{
                          skipTrace: (skipTraceResults.skipTrace as SkipTraceData | null) || null,
                          socialMedia: (skipTraceResults.socialMedia as SocialMediaData) || {},
                          email: emailQuery,
                          searchedAt: skipTraceResults.searchedAt || new Date().toISOString(),
                        }}
                        searchType="email"
                        query={emailQuery}
                      />
                      <Card className="mt-4 border-primary/20">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Bell className="h-4 w-4" />
                            Monitor This Email
                          </CardTitle>
                          <CardDescription>
                            Get notified when new information is found for this email address
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {subscriptionSuccess && subscriptionSuccess.includes(emailQuery) ? (
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-sm">{subscriptionSuccess}</span>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start space-x-2">
                                <Checkbox
                                  id="email-consent"
                                  checked={consentChecked}
                                  onCheckedChange={(checked) => setConsentChecked(checked as boolean)}
                                />
                                <label htmlFor="email-consent" className="text-xs text-muted-foreground leading-tight">
                                  I have legal authorization to monitor this email address
                                </label>
                              </div>
                              <Button
                                onClick={() => handleCreateSubscription("email", emailQuery, "weekly")}
                                disabled={creatingSubscription || !consentChecked}
                                className="w-full"
                                variant="outline"
                              >
                                {creatingSubscription ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                  </>
                                ) : (
                                  <>
                                    <Bell className="mr-2 h-4 w-4" />
                                    Create Monitoring Subscription
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </>
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
                        autoComplete="tel"
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
                      Enter phone in international format with country code. US numbers: +1 followed by 10 digits. If no data appears, a fresh lookup runs automatically.
                    </p>
                  </div>
                  {phoneValidationResult && <PhoneValidationResult data={phoneValidationResult} />}
                  {phoneSearchResults?.skipTraceData ? (
                    <>
                      <SkipTraceResults
                        data={{
                          skipTrace: (phoneSearchResults.skipTraceData as SkipTraceData) || null,
                          socialMedia: {},
                          email: "",
                          searchedAt: phoneSearchResults.searchPerformed || new Date().toISOString(),
                        }}
                        searchType="phone"
                        query={phoneQuery}
                      />
                      <Card className="mt-4 border-primary/20">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Bell className="h-4 w-4" />
                            Monitor This Phone Number
                          </CardTitle>
                          <CardDescription>
                            Get notified when carrier or ownership information changes
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {subscriptionSuccess && subscriptionSuccess.includes(phoneQuery) ? (
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-sm">{subscriptionSuccess}</span>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start space-x-2">
                                <Checkbox
                                  id="phone-consent"
                                  checked={consentChecked}
                                  onCheckedChange={(checked) => setConsentChecked(checked as boolean)}
                                />
                                <label htmlFor="phone-consent" className="text-xs text-muted-foreground leading-tight">
                                  I have legal authorization to monitor this phone number
                                </label>
                              </div>
                              <Button
                                onClick={() => handleCreateSubscription("phone", phoneQuery, "weekly")}
                                disabled={creatingSubscription || !consentChecked}
                                className="w-full"
                                variant="outline"
                              >
                                {creatingSubscription ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                  </>
                                ) : (
                                  <>
                                    <Bell className="mr-2 h-4 w-4" />
                                    Create Monitoring Subscription
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </>
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
                        autoComplete="given-name"
                        placeholder="First Name *"
                        className="h-12"
                        value={nameFirst}
                        onChange={(e) => setNameFirst(e.target.value)}
                        required
                      />
                      <Input
                        id="name-last"
                        name="lastName"
                        autoComplete="family-name"
                        placeholder="Last Name *"
                        className="h-12"
                        value={nameLast}
                        onChange={(e) => setNameLast(e.target.value)}
                        required
                      />
                      <Input
                        id="name-middle"
                        name="middleName"
                        autoComplete="additional-name"
                        placeholder="Middle Name (optional)"
                        className="h-12"
                        value={nameMiddle}
                        onChange={(e) => setNameMiddle(e.target.value)}
                      />
                      <Input
                        id="name-city"
                        name="city"
                        autoComplete="address-level2"
                        placeholder="City (optional)"
                        className="h-12"
                        value={nameCity}
                        onChange={(e) => setNameCity(e.target.value)}
                      />
                      <Input
                        id="name-state"
                        name="state"
                        autoComplete="address-level1"
                        placeholder="State (optional)"
                        className="h-12"
                        value={nameState}
                        onChange={(e) => setNameState(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Input
                          id="name-age"
                          name="age"
                          type="number"
                          placeholder="Age (optional)"
                          className="h-12"
                          value={nameAge}
                          onChange={(e) => setNameAge(e.target.value)}
                          min="1"
                          max="120"
                        />
                        <Input
                          id="name-dob"
                          name="dateOfBirth"
                          type="date"
                          placeholder="Date of Birth (optional)"
                          className="h-12"
                          value={nameDOB}
                          onChange={(e) => setNameDOB(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      💡 Tip: Adding city/state, middle name, or age/DOB filters can significantly improve search accuracy for common names.
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
                      {nameSearchResults.multipleResults && nameSearchResults.multipleResults.length > 1 ? (
                        <NameSearchResults
                          candidates={nameSearchResults.multipleResults.map((r: { person: unknown; confidence?: number; age?: number; location?: string }) => {
                            const person = r.person as Record<string, unknown>
                            return {
                              person: {
                                names: Array.isArray(person.names) ? person.names as Array<string | { display?: string; full?: string; first?: string; last?: string }> : undefined,
                                addresses: Array.isArray(person.addresses) ? person.addresses as Array<string | { display?: string; city?: string; state?: string }> : undefined,
                                phones: Array.isArray(person.phones) ? person.phones as Array<string | { number?: string; display?: string }> : undefined,
                                emails: Array.isArray(person.emails) ? person.emails as Array<string | { address?: string; email?: string }> : undefined,
                              },
                              confidence: r.confidence,
                              age: r.age,
                              location: r.location,
                            }
                          })}
                          query={{ firstName: nameFirst, lastName: nameLast, city: nameCity, state: nameState }}
                          onSelectCandidate={(candidate) => {
                            // Update to show selected candidate
                            setNameSearchResults({
                              ...nameSearchResults,
                              skipTraceData: { person: candidate.person } as SkipTraceData,
                            })
                          }}
                        />
                      ) : nameSearchResults.skipTraceData ? (
                        <>
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
                            searchType="name"
                            query={{ firstName: nameFirst, lastName: nameLast, city: nameCity, state: nameState }}
                          />
                          <Card className="mt-4 border-primary/20">
                            <CardHeader>
                              <CardTitle className="text-base flex items-center gap-2">
                                <Bell className="h-4 w-4" />
                                Monitor This Person
                              </CardTitle>
                              <CardDescription>
                                Get notified when new information is found for {nameFirst} {nameLast}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {subscriptionSuccess && subscriptionSuccess.includes(`${nameFirst} ${nameLast}`) ? (
                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span className="text-sm">{subscriptionSuccess}</span>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-start space-x-2">
                                    <Checkbox
                                      id="name-consent"
                                      checked={consentChecked}
                                      onCheckedChange={(checked) => setConsentChecked(checked as boolean)}
                                    />
                                    <label htmlFor="name-consent" className="text-xs text-muted-foreground leading-tight">
                                      I have legal authorization to monitor this person
                                    </label>
                                  </div>
                                  <Button
                                    onClick={() => handleCreateSubscription("name", `${nameFirst} ${nameLast}`, "weekly")}
                                    disabled={creatingSubscription || !consentChecked}
                                    className="w-full"
                                    variant="outline"
                                  >
                                    {creatingSubscription ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                      </>
                                    ) : (
                                      <>
                                        <Bell className="mr-2 h-4 w-4" />
                                        Create Monitoring Subscription
                                      </>
                                    )}
                                  </Button>
                                </>
                              )}
                            </CardContent>
                          </Card>
                        </>
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
                        autoComplete="street-address"
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
                    <AddressSearchResults
                      data={{
                        query: addressSearchResults.query?.street 
                          ? {
                              street: addressSearchResults.query.street,
                              city: addressSearchResults.query.city || "",
                              state: addressSearchResults.query.state || "",
                              zip: addressSearchResults.query.zip || "",
                              fullAddress: addressSearchResults.query.fullAddress || addressQuery,
                            }
                          : {
                              street: addressQuery.split(",")[0] || "",
                              city: "",
                              state: "",
                              zip: "",
                              fullAddress: addressQuery,
                            },
                        residents: addressSearchResults.residents,
                        propertyInfo: (addressSearchResults.propertyInfo?.address
                          ? addressSearchResults.propertyInfo
                          : {
                              address: addressSearchResults.query?.fullAddress || addressQuery,
                              type: addressSearchResults.propertyInfo?.type || "Residential",
                              county: addressSearchResults.propertyInfo?.county,
                            }) as { address: string; type: string; county?: string; estimatedValue?: string | number; owner?: string; lastSaleDate?: string },
                        instructions: addressSearchResults.instructions,
                        searchPerformed: addressSearchResults.searchPerformed || new Date().toISOString(),
                      }}
                    />
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
                        <CardDescription>
                          Create subscriptions to monitor email addresses, phone numbers, or names for changes
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {monitoringData.services ? (
                          <div className="space-y-4">
                            {monitoringData.services.map((service: { name?: string; description?: string; status?: string; targetType?: string }, index: number) => (
                              <div key={index} className="p-4 border rounded-lg">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="font-semibold">{service.name}</p>
                                    <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                                  </div>
                                  {service.status === "available" && (
                                    <Badge variant="default" className="ml-2">Available</Badge>
                                  )}
                                  {service.status === "enterprise" && (
                                    <Badge variant="secondary" className="ml-2">Enterprise</Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                            <div className="pt-4 border-t">
                              <Button
                                onClick={() => window.location.href = "/monitoring"}
                                className="w-full"
                                variant="outline"
                              >
                                <Bell className="mr-2 h-4 w-4" />
                                View Monitoring Dashboard
                                <ExternalLink className="ml-2 h-4 w-4" />
                              </Button>
                            </div>
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
