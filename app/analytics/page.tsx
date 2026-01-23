"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { BarChart3, TrendingUp, Users, Search, Activity, Clock, Download } from "lucide-react"
import { Suspense, useEffect, useState } from "react"
import Loading from "./loading"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { exportToJSON, exportToCSV } from "@/lib/export-utils"

interface AnalyticsData {
  totalSearches: number
  successfulSearches: number
  successRate: number
  activeUsers: number
  avgResponseTime: number
  avgDataPoints?: number
  searchesByType: Record<string, number>
  typePercentages: Record<string, number>
  dailyVolumes: Array<{ date: string; count: number }>
  peakHours?: Array<{ hour: number; count: number }>
  successRateTrends?: Array<{ date: string; successRate: number; total: number }>
  userActivityTrends?: Array<{ date: string; count: number }>
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch("/api/analytics/stats?days=30")
        if (response.ok) {
          const analyticsData = await response.json()
          setData(analyticsData)
        } else {
          const errorData = await response.json().catch(() => ({}))
          setError(errorData.error || "Failed to load analytics data")
        }
      } catch (err) {
        setError("Error loading analytics. Please try again later.")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Track your search performance, usage statistics, and investigation insights
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (data) {
                  exportToJSON(data, `analytics-report-${new Date().toISOString().split("T")[0]}`)
                }
              }}
              disabled={!data || loading}
            >
              <Download className="mr-2 h-4 w-4" />
              Export JSON
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (data) {
                  // Convert analytics data to CSV format
                  const csvData = [
                    { Metric: "Total Searches", Value: data.totalSearches },
                    { Metric: "Successful Searches", Value: data.successfulSearches },
                    { Metric: "Success Rate (%)", Value: data.successRate },
                    { Metric: "Active Users", Value: data.activeUsers },
                    { Metric: "Avg Response Time (ms)", Value: data.avgResponseTime },
                    ...(data.avgDataPoints ? [{ Metric: "Avg Data Points", Value: data.avgDataPoints }] : []),
                    ...Object.entries(data.searchesByType).map(([type, count]) => ({
                      Metric: `Searches - ${type}`,
                      Value: count,
                    })),
                  ]
                  exportToCSV(csvData, `analytics-report-${new Date().toISOString().split("T")[0]}`)
                }
              }}
              disabled={!data || loading}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loading />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
                  <Search className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data?.totalSearches.toLocaleString() || 0}</div>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Successful Matches</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data?.successRate.toFixed(1) || 0}%</div>
                  <p className="text-xs text-muted-foreground">
                    {data?.successfulSearches || 0} successful searches
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data?.activeUsers || 0}</div>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data?.avgResponseTime ? `${(data.avgResponseTime / 1000).toFixed(1)}s` : "N/A"}
                  </div>
                  <p className="text-xs text-muted-foreground">Average API response time</p>
                </CardContent>
              </Card>

              {data?.avgDataPoints !== undefined && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Avg Data Points</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data.avgDataPoints}</div>
                    <p className="text-xs text-muted-foreground">Per successful search</p>
                  </CardContent>
                </Card>
              )}
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
                  {data?.dailyVolumes && data.dailyVolumes.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={data.dailyVolumes.reverse()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="count" stroke="#8884d8" name="Searches" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center border border-dashed border-border rounded-lg">
                      <div className="text-center text-muted-foreground">
                        <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No data available</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Search Type Distribution</CardTitle>
                    <CardDescription>Breakdown by search method</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {data?.typePercentages ? (
                      Object.entries(data.typePercentages)
                        .sort(([, a], [, b]) => b - a)
                        .map(([type, percentage]) => (
                          <div key={type}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium capitalize">{type.replace("_", " ")}</span>
                              <span className="text-sm text-muted-foreground">{percentage}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No search type data available</p>
                    )}
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
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Success Rate Trends</CardTitle>
                    <CardDescription>Daily success rate over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data?.successRateTrends && data.successRateTrends.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data.successRateTrends.reverse()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="successRate" stroke="#10b981" name="Success Rate %" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center border border-dashed border-border rounded-lg">
                        <div className="text-center text-muted-foreground">
                          <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No data available</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Peak Usage Hours</CardTitle>
                    <CardDescription>Most active hours of the day</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data?.peakHours && data.peakHours.length > 0 ? (
                      <div className="space-y-3">
                        {data.peakHours.map((peak: { hour: number; count: number }) => (
                          <div key={peak.hour} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {peak.hour === 0 ? "12 AM" : peak.hour < 12 ? `${peak.hour} AM` : peak.hour === 12 ? "12 PM" : `${peak.hour - 12} PM`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-1 mx-4">
                              <div className="h-2 bg-muted rounded-full flex-1 overflow-hidden">
                                <div
                                  className="h-full bg-primary"
                                  style={{ width: `${(peak.count / ((data.peakHours && data.peakHours[0]?.count) || 1)) * 100}%` }}
                                />
                              </div>
                              <span className="text-sm text-muted-foreground w-12 text-right">{peak.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No peak hour data available</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>User Activity Trends</CardTitle>
                    <CardDescription>Daily active users</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data?.userActivityTrends && data.userActivityTrends.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data.userActivityTrends.reverse()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="count" stroke="#3b82f6" name="Active Users" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center border border-dashed border-border rounded-lg">
                        <div className="text-center text-muted-foreground">
                          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No data available</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>System Performance Metrics</CardTitle>
                    <CardDescription>API response times and success rates</CardDescription>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </Suspense>
          </>
        )}
      </div>
    </main>
  )
}
