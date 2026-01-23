"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, Star, Trash2, Play, Clock, Mail, Phone, User, MapPin } from "lucide-react"
import { Suspense } from "react"

const Loading = () => null

export default function SavedSearchesPage() {
  const [searches] = useState([
    {
      id: "1",
      name: "High Priority Leads",
      type: "email",
      query: "john.doe@example.com",
      date: "2024-01-20",
      results: 15,
      starred: true,
    },
    {
      id: "2",
      name: "Phone Investigation",
      type: "phone",
      query: "+1 555-0123",
      date: "2024-01-19",
      results: 8,
      starred: false,
    },
    {
      id: "3",
      name: "Name Search - Johnson",
      type: "name",
      query: "Robert Johnson",
      date: "2024-01-18",
      results: 23,
      starred: true,
    },
    {
      id: "4",
      name: "Address Lookup",
      type: "address",
      query: "123 Main St, Chicago",
      date: "2024-01-17",
      results: 4,
      starred: false,
    },
  ])


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

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="saved-searches-search"
              name="savedSearchesSearch"
              autoComplete="off"
              placeholder="Search saved items..."
              className="pl-10"
            />
          </div>
        </div>

        <Suspense fallback={<Loading />}>
          <div className="grid gap-4">
            {searches.map((search) => (
              <Card key={search.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-lg border ${getTypeColor(search.type)} bg-muted`}>
                        {getTypeIcon(search.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{search.name}</h3>
                          {search.starred && (
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 truncate">
                          {search.query}
                        </p>
                        <div className="flex flex-wrap gap-2 items-center">
                          <Badge variant="outline" className="capitalize">
                            {search.type}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {search.date}
                          </div>
                          <Badge variant="secondary">
                            {search.results} results
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="gap-2 bg-transparent">
                        <Play className="h-4 w-4" />
                        Run
                      </Button>
                      <Button size="sm" variant="ghost" className="text-yellow-600 hover:text-yellow-700">
                        <Star className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive/90">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
