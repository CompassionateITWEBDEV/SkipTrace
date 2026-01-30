"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Search, Activity, Shield, Loader2, AlertCircle } from "lucide-react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [stats, setStats] = useState<{
    totalUsers: number
    totalSearches: number
    activeUsers: number
    systemHealth: string
  } | null>(null)
  const [users, setUsers] = useState<Array<{ id: string; email: string; name: string | null; plan: string; role: string; createdAt: string }>>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [health, setHealth] = useState<{
    status: string
    latencyMs?: number
    services?: { database?: { status: string; responseTime?: number }; redis?: { status: string; responseTime?: number }; queues?: { batch?: { waiting: number; active: number }; monitoring?: { waiting: number; active: number } } }
  } | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)

  const checkAdminAccess = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/check")
      if (response.ok) {
        const data = await response.json()
        setIsAdmin(data.isAdmin || false)
        if (data.isAdmin) {
          fetchStats()
        } else {
          setLoading(false)
        }
      } else {
        setIsAdmin(false)
        setLoading(false)
      }
    } catch (error) {
      console.error("Error checking admin access:", error)
      setIsAdmin(false)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push("/auth/signin")
      return
    }

    checkAdminAccess()
  }, [session, status, router, checkAdminAccess])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Error fetching admin stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      const response = await fetch("/api/admin/users?limit=50")
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setUsersLoading(false)
    }
  }

  const fetchHealth = async () => {
    setHealthLoading(true)
    try {
      const response = await fetch("/api/health")
      if (response.ok) {
        const data = await response.json()
        setHealth(data)
      }
    } catch (error) {
      console.error("Error fetching health:", error)
    } finally {
      setHealthLoading(false)
    }
  }

  const updateUserPlan = async (userId: string, plan: string) => {
    setUpdatingUserId(userId)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      if (response.ok) {
        const updated = await response.json()
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, plan: updated.plan } : u)))
      }
    } catch (error) {
      console.error("Error updating user plan:", error)
    } finally {
      setUpdatingUserId(null)
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </main>
    )
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Access Denied
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                You do not have permission to access the admin dashboard.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            System monitoring and user management
          </p>
        </div>

        {stats && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
                <Search className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSearches.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeUsers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Badge variant={stats.systemHealth === "healthy" ? "default" : "destructive"}>
                  {stats.systemHealth}
                </Badge>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Overview</CardTitle>
                <CardDescription>Platform health and usage metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Admin features are being developed. Full user management, system monitoring, and audit logs will be available here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View users and adjust plan (support)</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" onClick={fetchUsers} disabled={usersLoading} className="mb-4">
                  {usersLoading ? "Loading…" : "Load users"}
                </Button>
                {users.length > 0 && (
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3">Email</th>
                          <th className="text-left p-3">Name</th>
                          <th className="text-left p-3">Plan</th>
                          <th className="text-left p-3">Role</th>
                          <th className="text-left p-3">Created</th>
                          <th className="text-left p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.id} className="border-b">
                            <td className="p-3 font-mono text-xs">{u.email}</td>
                            <td className="p-3">{u.name || "—"}</td>
                            <td className="p-3">
                              <Badge variant="secondary">{u.plan}</Badge>
                            </td>
                            <td className="p-3">{u.role}</td>
                            <td className="p-3 text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                            <td className="p-3">
                              <select
                                className="rounded border bg-background px-2 py-1 text-sm"
                                value={u.plan}
                                disabled={updatingUserId === u.id}
                                onChange={(e) => updateUserPlan(u.id, e.target.value)}
                              >
                                <option value="FREE">FREE</option>
                                <option value="STARTER">STARTER</option>
                                <option value="PROFESSIONAL">PROFESSIONAL</option>
                                <option value="ENTERPRISE">ENTERPRISE</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Health Dashboard</CardTitle>
                <CardDescription>Database, Redis, and queue status</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" onClick={fetchHealth} disabled={healthLoading} className="mb-4">
                  {healthLoading ? "Loading…" : "Refresh health"}
                </Button>
                {health && (
                  <div className="space-y-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Overall:</span>
                      <Badge variant={health.status === "healthy" ? "default" : health.status === "degraded" ? "secondary" : "destructive"}>
                        {health.status}
                      </Badge>
                      {health.latencyMs != null && (
                        <span className="text-muted-foreground">({health.latencyMs}ms)</span>
                      )}
                    </div>
                    {health.services?.database && (
                      <div>
                        <span className="font-medium">Database: </span>
                        <Badge variant={health.services.database.status === "up" ? "default" : "destructive"}>
                          {health.services.database.status}
                        </Badge>
                        {health.services.database.responseTime != null && (
                          <span className="text-muted-foreground ml-2">{health.services.database.responseTime}ms</span>
                        )}
                      </div>
                    )}
                    {health.services?.redis && (
                      <div>
                        <span className="font-medium">Redis: </span>
                        <Badge variant={health.services.redis.status === "up" ? "default" : "destructive"}>
                          {health.services.redis.status}
                        </Badge>
                        {health.services.redis.responseTime != null && (
                          <span className="text-muted-foreground ml-2">{health.services.redis.responseTime}ms</span>
                        )}
                      </div>
                    )}
                    {health.services?.queues && (
                      <div className="pt-2 border-t">
                        <span className="font-medium">Queues:</span>
                        <ul className="mt-2 space-y-1 text-muted-foreground">
                          {health.services.queues.batch && (
                            <li>Batch: waiting {health.services.queues.batch.waiting}, active {health.services.queues.batch.active}</li>
                          )}
                          {health.services.queues.monitoring && (
                            <li>Monitoring: waiting {health.services.queues.monitoring.waiting}, active {health.services.queues.monitoring.active}</li>
                          )}
                          {!health.services.queues.batch && !health.services.queues.monitoring && (
                            <li>No queue data (Redis may be down or queues not configured)</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
