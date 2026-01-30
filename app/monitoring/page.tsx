"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEffect, useState } from "react"
import { Bell, Plus, Trash2, Clock, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
  const [showNewModal, setShowNewModal] = useState(false)
  const [newTargetType, setNewTargetType] = useState<"email" | "phone" | "name">("email")
  const [newTargetValue, setNewTargetValue] = useState("")
  const [newFrequency, setNewFrequency] = useState("weekly")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchSubscriptions()
    fetchNotifications()
    // Prefer SSE for live updates; fall back to 30s polling
    let sse: EventSource | null = null
    if (typeof EventSource !== "undefined") {
      try {
        sse = new EventSource("/api/notifications/stream")
        sse.addEventListener("refresh", () => fetchNotifications())
        sse.onerror = () => {
          sse?.close()
          sse = null
        }
      } catch {
        // Fall through to polling
      }
    }
    const interval = setInterval(() => fetchNotifications(), 30000)
    return () => {
      clearInterval(interval)
      sse?.close()
    }
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
        toast.success("Marked as read")
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
      toast.error("Failed to mark as read")
    }
  }

  async function markAllNotificationsRead() {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      })
      if (response.ok) {
        await fetchNotifications()
        toast.success("All notifications marked as read")
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error)
      toast.error("Failed to mark all as read")
    }
  }

  async function deleteNotification(id: string) {
    try {
      const response = await fetch(`/api/notifications?id=${id}`, { method: "DELETE" })
      if (response.ok) {
        await fetchNotifications()
        toast.success("Notification deleted")
      }
    } catch (error) {
      console.error("Failed to delete notification:", error)
      toast.error("Failed to delete notification")
    }
  }

  async function deleteAllReadNotifications() {
    try {
      const response = await fetch("/api/notifications?deleteAllRead=true", { method: "DELETE" })
      if (response.ok) {
        await fetchNotifications()
        toast.success("Read notifications deleted")
      }
    } catch (error) {
      console.error("Failed to delete read notifications:", error)
      toast.error("Failed to delete read notifications")
    }
  }

  async function handleCreateSubscription() {
    const targetValue = newTargetValue.trim()
    if (!targetValue) {
      toast.error("Please enter a value to monitor")
      return
    }
    setSubmitting(true)
    try {
      const response = await fetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: newTargetType,
          targetValue,
          frequency: newFrequency,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        setShowNewModal(false)
        setNewTargetValue("")
        await fetchSubscriptions()
        toast.success("Monitoring subscription created")
      } else {
        toast.error(data.error || "Failed to create subscription")
      }
    } catch (error) {
      console.error("Failed to create subscription:", error)
      toast.error("Failed to create subscription")
    } finally {
      setSubmitting(false)
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
        toast.success("Subscription deleted")
      }
    } catch (error) {
      console.error("Failed to delete subscription:", error)
      toast.error("Failed to delete subscription")
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
          <Button onClick={() => setShowNewModal(true)}>
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
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <h2 className="text-lg font-semibold">Recent Notifications</h2>
                    <div className="flex gap-2">
                      {unreadCount > 0 && (
                        <Button variant="outline" size="sm" onClick={markAllNotificationsRead}>
                          Mark all as read
                        </Button>
                      )}
                      {notifications.some((n) => n.read) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={deleteAllReadNotifications}
                          className="text-muted-foreground"
                        >
                          Delete read
                        </Button>
                      )}
                    </div>
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
                            <div className="flex gap-1">
                              {!notification.read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markNotificationRead(notification.id)}
                                >
                                  Mark read
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteNotification(notification.id)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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

        <AlertDialog open={showNewModal} onOpenChange={setShowNewModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>New Monitoring Subscription</AlertDialogTitle>
              <AlertDialogDescription>
                Monitor an email, phone, or name for changes. We&apos;ll check periodically and notify you when we find updates.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="new-target-type">Type</Label>
                <select
                  id="new-target-type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={newTargetType}
                  onChange={(e) => setNewTargetType(e.target.value as "email" | "phone" | "name")}
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="name">Name</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-target-value">Value</Label>
                <Input
                  id="new-target-value"
                  placeholder={newTargetType === "email" ? "user@example.com" : newTargetType === "phone" ? "+1 555 123 4567" : "John Smith"}
                  value={newTargetValue}
                  onChange={(e) => setNewTargetValue(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-frequency">Check frequency</Label>
                <select
                  id="new-frequency"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={newFrequency}
                  onChange={(e) => setNewFrequency(e.target.value)}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
              <Button onClick={handleCreateSubscription} disabled={submitting}>
                {submitting ? "Creating..." : "Create"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </main>
  )
}
