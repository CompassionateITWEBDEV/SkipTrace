"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, TrendingUp, Users, Search, Activity, Clock } from "lucide-react"
import { Suspense } from "react"
import Loading from "./loading"

export default function AnalyticsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Track your search performance, usage statistics, and investigation insights
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2,847</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+12.3%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Successful Matches</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">94.2%</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+2.1%</span> success rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">342</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+8</span> new this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1.2s</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">-0.3s</span> faster
              </p>
            </CardContent>
          </Card>
        </div>

        <Suspense fallback={<Loading />}>
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="searches">Search Analytics</TabsTrigger>
              <TabsTrigger value="platforms">Platform Stats</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Search Volume Trends</CardTitle>
                  <CardDescription>Daily search activity over the last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center border border-dashed border-border rounded-lg">
                    <div className="text-center text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Chart visualization placeholder</p>
                      <p className="text-sm">Integrate with Recharts or Chart.js</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Search Type Distribution</CardTitle>
                    <CardDescription>Breakdown by search method</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Email Search</span>
                        <span className="text-sm text-muted-foreground">42%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: "42%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Phone Search</span>
                        <span className="text-sm text-muted-foreground">31%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-chart-2" style={{ width: "31%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Name Search</span>
                        <span className="text-sm text-muted-foreground">18%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-chart-3" style={{ width: "18%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Address Search</span>
                        <span className="text-sm text-muted-foreground">9%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-chart-4" style={{ width: "9%" }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Platforms</CardTitle>
                    <CardDescription>Most active social media platforms found</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { name: "LinkedIn", count: 1247, color: "bg-blue-500" },
                        { name: "Facebook", count: 1089, color: "bg-blue-600" },
                        { name: "Instagram", count: 892, color: "bg-purple-500" },
                        { name: "Twitter/X", count: 756, color: "bg-sky-500" },
                        { name: "TikTok", count: 534, color: "bg-pink-500" },
                      ].map((platform) => (
                        <div key={platform.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`h-3 w-3 rounded-full ${platform.color}`} />
                            <span className="text-sm font-medium">{platform.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{platform.count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="searches">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Search Activity</CardTitle>
                  <CardDescription>Latest searches and their results</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { query: "john.doe@example.com", type: "Email", status: "Success", time: "2 min ago" },
                      { query: "+1 (555) 123-4567", type: "Phone", status: "Success", time: "5 min ago" },
                      { query: "Jane Smith, New York", type: "Name", status: "Partial", time: "12 min ago" },
                      { query: "123 Main St, Chicago", type: "Address", status: "Success", time: "18 min ago" },
                    ].map((search, i) => (
                      <div key={i} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
                        <div>
                          <p className="font-medium text-sm">{search.query}</p>
                          <p className="text-xs text-muted-foreground">{search.type} Search</p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-block px-2 py-1 text-xs rounded-full ${
                              search.status === "Success"
                                ? "bg-green-500/10 text-green-600"
                                : "bg-yellow-500/10 text-yellow-600"
                            }`}
                          >
                            {search.status}
                          </span>
                          <p className="text-xs text-muted-foreground mt-1">{search.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="platforms">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Coverage Analysis</CardTitle>
                  <CardDescription>48+ platforms monitored for comprehensive results</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      "LinkedIn",
                      "Facebook",
                      "Instagram",
                      "Twitter/X",
                      "TikTok",
                      "Snapchat",
                      "Pinterest",
                      "Reddit",
                    ].map((platform) => (
                      <div key={platform} className="border border-border rounded-lg p-4 text-center">
                        <Activity className="h-6 w-6 mx-auto mb-2 text-primary" />
                        <p className="text-sm font-medium">{platform}</p>
                        <p className="text-xs text-muted-foreground mt-1">Active</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance">
              <Card>
                <CardHeader>
                  <CardTitle>System Performance Metrics</CardTitle>
                  <CardDescription>API response times and success rates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium mb-4">API Endpoint Performance</h4>
                      <div className="space-y-3">
                        {[
                          { endpoint: "Email Social Check", avgTime: "0.8s", success: "98.2%" },
                          { endpoint: "Skip Trace Search", avgTime: "1.2s", success: "96.5%" },
                          { endpoint: "Phone Validation", avgTime: "0.6s", success: "99.1%" },
                          { endpoint: "Virtual Number Check", avgTime: "0.9s", success: "97.8%" },
                        ].map((api) => (
                          <div key={api.endpoint} className="flex items-center justify-between border-b border-border pb-3">
                            <span className="text-sm font-medium">{api.endpoint}</span>
                            <div className="flex gap-4 text-sm">
                              <span className="text-muted-foreground">Avg: {api.avgTime}</span>
                              <span className="text-green-600">{api.success}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </Suspense>
      </div>
    </main>
  )
}
