"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEffect, useState } from "react"
import { Bell, Plus, Trash2, Clock, CheckCircle2, XCircle } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface MonitoringSubscription {
  id: string
  targetType: string
  targetValue: string
  frequency: string
  active: boolean
  lastChecked: string | null
  nextCheck: string | null
  createdAt: string
}

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: string
  metadata?: Record<string, unknown>
}

export default function MonitoringPage() {
  const [subscriptions, setSubscriptions] = useState<MonitoringSubscription[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    fetchSubscriptions()
    fetchNotifications()
    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      fetchNotifications()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchSubscriptions() {
    try {
      const response = await fetch("/api/monitoring")
      if (response.ok) {
        const data = await response.json()
        setSubscriptions(data.subscriptions || [])
      }
    } catch (error) {
      console.error("Failed to fetch subscriptions:", error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchNotifications() {
    try {
      const response = await fetch("/api/notifications?unreadOnly=false&limit=20")
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    }
  }

  async function markNotificationRead(id: string) {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: [id] }),
      })
      if (response.ok) {
        await fetchNotifications()
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
    }
  }

  async function handleDelete(id: string) {
    try {
      const response = await fetch(`/api/monitoring?id=${id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        await fetchSubscriptions()
        setDeleteId(null)
      }
    } catch (error) {
      console.error("Failed to delete subscription:", error)
    }
  }

  const activeSubscriptions = subscriptions.filter((s) => s.active)
  const inactiveSubscriptions = subscriptions.filter((s) => !s.active)

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Monitoring Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Track changes to individuals and receive alerts when new information is found
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Subscription
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : (
          <Tabs defaultValue="active" className="space-y-4">
            <TabsList>
              <TabsTrigger value="active">
                Active ({activeSubscriptions.length})
              </TabsTrigger>
              <TabsTrigger value="inactive">
                Inactive ({inactiveSubscriptions.length})
              </TabsTrigger>
              <TabsTrigger value="notifications" className="relative">
                Notifications
                {unreadCount > 0 && (
                  <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {activeSubscriptions.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center text-muted-foreground">
                      <Bell className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>No active monitoring subscriptions</p>
                      <p className="text-sm mt-2">Create a subscription to start monitoring</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                activeSubscriptions.map((subscription) => (
                  <Card key={subscription.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {subscription.targetType.toUpperCase()}: {subscription.targetValue}
                            <Badge variant={subscription.active ? "default" : "secondary"}>
                              {subscription.active ? "Active" : "Inactive"}
                            </Badge>
                          </CardTitle>
                          <CardDescription>
                            Frequency: {subscription.frequency}
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(subscription.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Last Checked</div>
                          <div className="flex items-center gap-2 mt-1">
                            {subscription.lastChecked ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span>
                                  {new Date(subscription.lastChecked).toLocaleDateString()}
                                </span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 text-gray-400" />
                                <span>Never</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Next Check</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-4 w-4 text-blue-500" />
                            <span>
                              {subscription.nextCheck
                                ? new Date(subscription.nextCheck).toLocaleDateString()
                                : "Not scheduled"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="inactive" className="space-y-4">
              {inactiveSubscriptions.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center text-muted-foreground">
                      <p>No inactive monitoring subscriptions</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                inactiveSubscriptions.map((subscription) => (
                  <Card key={subscription.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {subscription.targetType.toUpperCase()}: {subscription.targetValue}
                        <Badge variant="secondary">Inactive</Badge>
                      </CardTitle>
                    </CardHeader>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              {notifications.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center text-muted-foreground">
                      <Bell className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>No notifications</p>
                      <p className="text-sm mt-2">You&apos;ll receive alerts here when monitoring detects changes</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Recent Notifications</h2>
                    {unreadCount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            await fetch("/api/notifications", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ markAllRead: true }),
                            })
                            await fetchNotifications()
                          } catch (error) {
                            console.error("Failed to mark all as read:", error)
                          }
                        }}
                      >
                        Mark all as read
                      </Button>
                    )}
                  </div>
                  {notifications.map((notification) => {
                    const changes = notification.type === "monitoring_alert" && notification.metadata?.changes && Array.isArray(notification.metadata.changes) 
                      ? notification.metadata.changes as unknown[]
                      : []
                    
                    return (
                      <Card key={notification.id} className={notification.read ? "opacity-75" : "border-primary/50"}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base flex items-center gap-2">
                                {notification.title}
                                {!notification.read && (
                                  <Badge variant="default" className="text-xs">New</Badge>
                                )}
                              </CardTitle>
                              <CardDescription className="mt-1">
                                {new Date(notification.createdAt).toLocaleString()}
                              </CardDescription>
                            </div>
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markNotificationRead(notification.id)}
                              >
                                Mark read
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">{notification.message}</p>
                          {changes.length > 0 && (
                            <div className="mt-3 p-3 bg-muted rounded-lg">
                              <p className="text-xs font-semibold mb-2">Changes Detected:</p>
                              <ul className="text-xs space-y-1">
                                {changes.map((change: unknown, idx: number) => (
                                  <li key={idx}>• {String(change)}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </>
              )}
            </TabsContent>
          </Tabs>
        )}

        <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Monitoring Subscription?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently deactivate this monitoring subscription. You can create a new
                one later if needed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId && handleDelete(deleteId)}
                className="bg-destructive text-destructive-foreground"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </main>
  )
}
