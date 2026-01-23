"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Download, Eye, Calendar, User, Mail, Phone, MapPin } from "lucide-react"
import Link from "next/link"

export default function ReportsPage() {
  const recentSearches = [
    {
      id: "1",
      type: "email",
      query: "john.doe@example.com",
      date: "2024-01-20",
      results: 12,
    },
    {
      id: "2",
      type: "name",
      query: "Jane Smith",
      date: "2024-01-19",
      results: 8,
    },
    {
      id: "3",
      type: "phone",
      query: "+1234567890",
      date: "2024-01-19",
      results: 5,
    },
    {
      id: "4",
      type: "address",
      query: "123 Main St, New York, NY",
      date: "2024-01-18",
      results: 3,
    },
  ]

  const getIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />
      case "name":
        return <User className="h-4 w-4" />
      case "phone":
        return <Phone className="h-4 w-4" />
      case "address":
        return <MapPin className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Search Reports</h1>
          <p className="text-muted-foreground">View and manage your search history and reports</p>
        </div>

        <div className="grid gap-4">
          {recentSearches.map((search) => (
            <Card key={search.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {getIcon(search.type)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{search.query}</CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-1">
                        <span className="capitalize">{search.type} Search</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {search.date}
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{search.results}</div>
                    <div className="text-xs text-muted-foreground">Results</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Link href={`/reports/${search.id}`} className="flex-1">
                    <Button variant="default" size="sm" className="w-full gap-2">
                      <Eye className="h-4 w-4" />
                      View Report
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {recentSearches.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Reports Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start searching to generate your first report
              </p>
              <Link href="/search">
                <Button>Go to Search</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
