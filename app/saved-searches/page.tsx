"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, Trash2, Play, Clock, Mail, Phone, User, MapPin, Loader2 } from "lucide-react"
import { Suspense } from "react"
import { useRouter } from "next/navigation"

const Loading = () => (
  <div className="flex items-center justify-center py-8">
    <Loader2 className="h-6 w-6 animate-spin" />
  </div>
)

interface SavedSearch {
  id: string
  name: string
  query: string
  results: unknown
  createdAt: string
}

export default function SavedSearchesPage() {
  const router = useRouter()
  const [searches, setSearches] = useState<SavedSearch[]>([])
  const [loading, setLoading] = useState(true)
  const [searchFilter, setSearchFilter] = useState("")


  useEffect(() => {
    fetchSearches()
  }, [])

  const fetchSearches = async () => {
    try {
      const response = await fetch("/api/saved-searches")
      if (response.ok) {
        const data = await response.json()
        setSearches(data.searches || [])
      }
    } catch (error) {
      console.error("Error fetching saved searches:", error)
    } finally {
      setLoading(false)
    }
  }

  const deleteSearch = async (id: string) => {
    if (!confirm("Are you sure you want to delete this saved search?")) return

    try {
      const response = await fetch(`/api/saved-searches?id=${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setSearches(searches.filter((s) => s.id !== id))
      }
    } catch (error) {
      console.error("Error deleting saved search:", error)
    }
  }

  const runSearch = (search: SavedSearch) => {
    const query = typeof search.query === "string" ? JSON.parse(search.query) : search.query
    // Navigate to search page with query pre-filled
    router.push(`/search?query=${encodeURIComponent(JSON.stringify(query))}`)
  }

  const getSearchType = (query: string): string => {
    try {
      const queryObj = typeof query === "string" ? JSON.parse(query) : query
      if (queryObj.email) return "email"
      if (queryObj.phone) return "phone"
      if (queryObj.firstName || queryObj.name) return "name"
      if (queryObj.street || queryObj.address) return "address"
      return "comprehensive"
    } catch {
      // Fallback to string matching
      if (query.includes("@")) return "email"
      if (query.match(/\d{10,}/)) return "phone"
      if (query.includes(",") && query.length > 20) return "address"
      return "name"
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />
      case "phone":
        return <Phone className="h-4 w-4" />
      case "name":
        return <User className="h-4 w-4" />
      case "address":
        return <MapPin className="h-4 w-4" />
      default:
        return <Search className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "email":
        return "text-blue-600"
      case "phone":
        return "text-green-600"
      case "name":
        return "text-purple-600"
      case "address":
        return "text-orange-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Saved Searches</h1>
          <p className="text-muted-foreground">
            Quick access to your frequently used searches and investigations
          </p>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="saved-searches-search"
              name="savedSearchesSearch"
              autoComplete="off"
              placeholder="Search saved items..."
              className="pl-10"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 text-muted-foreground"
            onClick={() => setSearchFilter("email")}
          >
            Fill test filter
          </Button>
        </div>

        <Suspense fallback={<Loading />}>
          {loading ? (
            <Loading />
          ) : (
            <div className="grid gap-4">
              {searches
                .filter((search) => {
                  if (!searchFilter) return true
                  const lowerFilter = searchFilter.toLowerCase()
                  return (
                    search.name.toLowerCase().includes(lowerFilter) ||
                    getQueryDisplay(search.query).toLowerCase().includes(lowerFilter)
                  )
                })
                .map((search) => {
                  const type = getSearchType(search.query)
                  const queryDisplay = getQueryDisplay(search.query)
                  const resultsCount = search.results
                    ? typeof search.results === "object" && search.results !== null
                      ? Object.keys(search.results).length
                      : 0
                    : 0

                  return (
                    <Card key={search.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <div className={`p-3 rounded-lg border ${getTypeColor(type)} bg-muted`}>
                              {getTypeIcon(type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-lg">{search.name}</h3>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2 truncate">{queryDisplay}</p>
                              <div className="flex flex-wrap gap-2 items-center">
                                <Badge variant="outline" className="capitalize">
                                  {type}
                                </Badge>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {new Date(search.createdAt).toLocaleDateString()}
                                </div>
                                {resultsCount > 0 && (
                                  <Badge variant="secondary">{resultsCount} results</Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2 bg-transparent"
                              onClick={() => runSearch(search)}
                            >
                              <Play className="h-4 w-4" />
                              Run
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive/90"
                              onClick={() => deleteSearch(search.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          )}
        </Suspense>

        {searches.length === 0 && (
          <Card className="border-2 border-dashed">
            <CardContent className="py-16 text-center">
              <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Saved Searches</h3>
              <p className="text-muted-foreground mb-6">
                Save your frequently used searches for quick access
              </p>
              <Button>Create Your First Search</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
