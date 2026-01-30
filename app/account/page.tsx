"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Key, Copy, Eye, EyeOff, Plus, Trash2, User, CreditCard, Settings, Loader2, Webhook, BookOpen } from "lucide-react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
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
import { toast } from "sonner"

interface ApiKey {
  id: string
  name: string
  key: string
  createdAt: string
  lastUsed: string | null
}

interface UsageStats {
  monthly: { used: number; limit: number; remaining: number }
  daily: { used: number; limit: number; remaining: number }
}

export default function AccountPage() {
  const { data: session } = useSession()
  const [showKey, setShowKey] = useState<Record<string, boolean>>({})
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [creatingKey, setCreatingKey] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [webhooks, setWebhooks] = useState<{ id: string; url: string; events: string[]; active: boolean; createdAt: string }[]>([])
  const [webhooksLoading, setWebhooksLoading] = useState(false)
  const [showWebhookForm, setShowWebhookForm] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState("")
  const [webhookEvents, setWebhookEvents] = useState<string[]>(["batch.completed"])
  const [creatingWebhook, setCreatingWebhook] = useState(false)
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [profileName, setProfileName] = useState<string>("")
  const [profileSaving, setProfileSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchApiKeys()
    fetchUsage()
  }, [])

  useEffect(() => {
    fetchWebhooks()
  }, [])

  useEffect(() => {
    if (session?.user?.name != null) setProfileName(String(session.user.name))
    else if (session?.user?.email) {
      fetch("/api/account")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.name != null) setProfileName(String(data.name))
        })
        .catch(() => {})
    }
  }, [session?.user?.name, session?.user?.email])

  const fetchApiKeys = async () => {
    try {
      const response = await fetch("/api/api-keys")
      if (response.ok) {
        const data = await response.json()
        setApiKeys(data.apiKeys || [])
      }
    } catch (error) {
      console.error("Error fetching API keys:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsage = async () => {
    try {
      const response = await fetch("/api/account/usage")
      if (response.ok) {
        const data = await response.json()
        setUsage(data)
      }
    } catch (error) {
      console.error("Error fetching usage:", error)
    }
  }

  const createApiKey = async () => {
    if (!newKeyName.trim()) return

    setCreatingKey(true)
    try {
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      })

      if (response.ok) {
        const data = await response.json()
        setApiKeys([data.apiKey, ...apiKeys])
        setNewKeyName("")
        setShowCreateForm(false)
        // Show the new key
        setShowKey({ [data.apiKey.id]: true })
      }
    } catch (error) {
      console.error("Error creating API key:", error)
    } finally {
      setCreatingKey(false)
    }
  }

  const deleteApiKey = async (id: string) => {
    if (!confirm("Are you sure you want to delete this API key?")) return

    try {
      const response = await fetch(`/api/api-keys?id=${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setApiKeys(apiKeys.filter((key) => key.id !== id))
      }
    } catch (error) {
      console.error("Error deleting API key:", error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const fetchWebhooks = async () => {
    setWebhooksLoading(true)
    try {
      const response = await fetch("/api/webhooks")
      if (response.ok) {
        const data = await response.json()
        setWebhooks(data.webhooks || [])
      }
    } catch (error) {
      console.error("Error fetching webhooks:", error)
    } finally {
      setWebhooksLoading(false)
    }
  }

  const createWebhook = async () => {
    if (!webhookUrl.trim() || webhookEvents.length === 0) return
    setCreatingWebhook(true)
    try {
      const response = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl.trim(), events: webhookEvents }),
      })
      if (response.ok) {
        const data = await response.json()
        setWebhooks([{ id: data.webhook.id, url: data.webhook.url, events: data.webhook.events, active: data.webhook.active, createdAt: data.webhook.createdAt }, ...webhooks])
        setWebhookUrl("")
        setWebhookEvents(["batch.completed"])
        setShowWebhookForm(false)
      }
    } catch (error) {
      console.error("Error creating webhook:", error)
    } finally {
      setCreatingWebhook(false)
    }
  }

  const deleteWebhook = async (id: string) => {
    if (!confirm("Remove this webhook?")) return
    try {
      const response = await fetch(`/api/webhooks?id=${id}`, { method: "DELETE" })
      if (response.ok) setWebhooks(webhooks.filter((w) => w.id !== id))
    } catch (error) {
      console.error("Error deleting webhook:", error)
    }
  }

  const toggleWebhookEvent = (event: string) => {
    setWebhookEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    )
  }

  const openBillingPortal = async () => {
    setPortalLoading(true)
    try {
      const response = await fetch("/api/billing/portal")
      const data = await response.json().catch(() => ({}))
      if (response.ok && data.url) {
        window.open(data.url, "_blank")
      } else {
        toast.error(data.error || "Unable to open billing portal. Upgrade a plan first.")
      }
    } catch (error) {
      console.error("Billing portal error:", error)
      toast.error("Failed to open billing portal")
    } finally {
      setPortalLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    setProfileSaving(true)
    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName.trim() || null }),
      })
      if (response.ok) {
        toast.success("Profile updated")
      } else {
        const data = await response.json().catch(() => ({}))
        toast.error(data.error || "Failed to update profile")
      }
    } catch (error) {
      console.error("Profile update error:", error)
      toast.error("Failed to update profile")
    } finally {
      setProfileSaving(false)
    }
  }

  const handleExportData = async () => {
    setExportLoading(true)
    try {
      const response = await fetch("/api/compliance/export-data")
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        toast.error(data.error || "Failed to export data")
        return
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `skiptrace-data-export-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Data export downloaded")
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Failed to export data")
    } finally {
      setExportLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteAccountLoading(true)
    try {
      const response = await fetch("/api/compliance/delete-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteAccount: true, reason: "User requested account deletion" }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(data.error || "Failed to delete account")
        setDeleteAccountLoading(false)
        return
      }
      setDeleteAccountOpen(false)
      toast.success("Account deleted. Redirecting…")
      await signOut({ redirect: false })
      router.push("/")
      router.refresh()
    } catch (error) {
      console.error("Error deleting account:", error)
      toast.error("Failed to delete account")
    } finally {
      setDeleteAccountLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your MASE Intelligence account, API keys, and billing
          </p>
        </div>

        <Tabs defaultValue="api-keys" className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="api-keys" className="gap-2">
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="gap-2">
              <Webhook className="h-4 w-4" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api-keys" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>API Keys</CardTitle>
                    <CardDescription>
                      Manage your API keys for accessing MASE Intelligence services.{" "}
                      <Link href="/api-docs" className="text-primary underline underline-offset-2 inline-flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        API docs
                      </Link>
                    </CardDescription>
                  </div>
                  <Button className="gap-2" onClick={() => setShowCreateForm(!showCreateForm)}>
                    <Plus className="h-4 w-4" />
                    Create New Key
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showCreateForm && (
                  <div className="mb-4 p-4 border border-border rounded-lg space-y-3">
                    <div>
                      <Label htmlFor="key-name">API Key Name</Label>
                      <Input
                        id="key-name"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="e.g., Production Key"
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={createApiKey} disabled={creatingKey || !newKeyName.trim()}>
                        {creatingKey ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create Key"
                        )}
                      </Button>
                      <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {apiKeys.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No API keys yet. Create one to get started.
                      </p>
                    ) : (
                      apiKeys.map((apiKey) => (
                        <div key={apiKey.id} className="border border-border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold mb-1">{apiKey.name}</h4>
                              <p className="text-xs text-muted-foreground">Created {new Date(apiKey.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex gap-2">
                              {apiKey.lastUsed && (
                                <Badge variant="secondary">
                                  Last used: {new Date(apiKey.lastUsed).toLocaleDateString()}
                                </Badge>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => deleteApiKey(apiKey.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              id={`api-key-${apiKey.id}`}
                              name={`apiKey-${apiKey.id}`}
                              type={showKey[apiKey.id] ? "text" : "password"}
                              autoComplete="off"
                              value={apiKey.key}
                              readOnly
                              className="font-mono text-sm"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowKey({ ...showKey, [apiKey.id]: !showKey[apiKey.id] })}
                              className="gap-2 bg-transparent"
                            >
                              {showKey[apiKey.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(apiKey.key)}
                              className="gap-2 bg-transparent"
                            >
                              <Copy className="h-4 w-4" />
                              Copy
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Usage Limits</CardTitle>
                <CardDescription>Current plan usage and limits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Searches this month</span>
                      <span className="text-sm text-muted-foreground">
                        {usage ? `${usage.monthly.used} / ${usage.monthly.limit}` : "—"}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: usage && usage.monthly.limit > 0
                            ? `${Math.min(100, (usage.monthly.used / usage.monthly.limit) * 100)}%`
                            : "0%",
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Searches today</span>
                      <span className="text-sm text-muted-foreground">
                        {usage ? `${usage.daily.used} / ${usage.daily.limit}` : "—"}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-chart-2 transition-all"
                        style={{
                          width: usage && usage.daily.limit > 0
                            ? `${Math.min(100, (usage.daily.used / usage.daily.limit) * 100)}%`
                            : "0%",
                        }}
                      />
                    </div>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-6 bg-transparent" asChild>
                  <Link href="/pricing">Upgrade Plan</Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Webhooks</CardTitle>
                    <CardDescription>Receive events (e.g. batch.completed, monitoring.alert) at your URL</CardDescription>
                  </div>
                  <Button className="gap-2" onClick={() => setShowWebhookForm(!showWebhookForm)}>
                    <Plus className="h-4 w-4" />
                    Add Webhook
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showWebhookForm && (
                  <div className="mb-4 p-4 border border-border rounded-lg space-y-3">
                    <div>
                      <Label htmlFor="webhook-url">URL</Label>
                      <Input
                        id="webhook-url"
                        type="url"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="https://your-server.com/webhook"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Events</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {["batch.completed", "monitoring.alert"].map((ev) => (
                          <label key={ev} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={webhookEvents.includes(ev)}
                              onChange={() => toggleWebhookEvent(ev)}
                              className="h-4 w-4"
                            />
                            {ev}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={createWebhook} disabled={creatingWebhook || !webhookUrl.trim()}>
                        {creatingWebhook ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                        Add
                      </Button>
                      <Button variant="outline" onClick={() => setShowWebhookForm(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
                {webhooksLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : webhooks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No webhooks. Add one to receive event payloads.</p>
                ) : (
                  <div className="space-y-4">
                    {webhooks.map((wh) => (
                      <div key={wh.id} className="border border-border rounded-lg p-4 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-mono text-sm truncate">{wh.url}</p>
                          <p className="text-xs text-muted-foreground">{wh.events?.join(", ") || "—"}</p>
                        </div>
                        <Button size="sm" variant="ghost" className="text-destructive shrink-0" onClick={() => deleteWebhook(wh.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your display name. Email is read-only and cannot be changed.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="profile-name">Display name</Label>
                  <Input
                    id="profile-name"
                    name="name"
                    autoComplete="name"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={session?.user?.email ?? ""}
                    disabled
                  />
                  <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                </div>
                <Button onClick={handleSaveProfile} disabled={profileSaving}>
                  {profileSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving…
                    </>
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing">
            <Card>
              <CardHeader>
                <CardTitle>Billing & Subscription</CardTitle>
                <CardDescription>Manage your subscription and payment methods</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-semibold capitalize">
                          {(session?.user as { plan?: string } | undefined)?.plan ?? "Free"} Plan
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {(session?.user as { plan?: string } | undefined)?.plan === "FREE"
                            ? "Upgrade for more searches and features"
                            : "Manage subscription and payment in Stripe"}
                        </p>
                      </div>
                      <Badge variant={(session?.user as { plan?: string } | undefined)?.plan === "FREE" ? "secondary" : "default"}>
                        {(session?.user as { plan?: string } | undefined)?.plan === "FREE" ? "Free" : "Active"}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      className="bg-transparent"
                      onClick={openBillingPortal}
                      disabled={portalLoading}
                    >
                      {portalLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Opening…
                        </>
                      ) : (
                        "Manage Subscription"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Configure your account preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Email Notifications</h4>
                  <div className="space-y-3">
                    {[
                      { label: "Search Results", description: "Get notified when batch searches complete" },
                      { label: "API Updates", description: "Receive updates about API changes" },
                      { label: "Weekly Reports", description: "Weekly usage and analytics summary" },
                    ].map((setting) => (
                      <div key={setting.label} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{setting.label}</p>
                          <p className="text-xs text-muted-foreground">{setting.description}</p>
                        </div>
                        <input
                          id={`notification-${setting.label.toLowerCase().replace(/\s+/g, "-")}`}
                          name={`notification-${setting.label.toLowerCase().replace(/\s+/g, "-")}`}
                          type="checkbox"
                          autoComplete="off"
                          className="h-4 w-4"
                          defaultChecked
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-border">
                  <h4 className="font-semibold">Data Export</h4>
                  <p className="text-sm text-muted-foreground">
                    Download a copy of your account data (profile, searches, reports, subscriptions) in JSON format for compliance or backup.
                  </p>
                  <Button variant="outline" onClick={handleExportData} disabled={exportLoading}>
                    {exportLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Exporting…
                      </>
                    ) : (
                      "Export my data"
                    )}
                  </Button>
                </div>
                <div className="space-y-4 pt-6 border-t border-border">
                  <h4 className="font-semibold text-destructive">Danger Zone</h4>
                  <AlertDialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
                    <Button variant="destructive" className="w-full" onClick={() => setDeleteAccountOpen(true)}>
                      Delete Account
                    </Button>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete your account and all associated data (searches, reports, API keys, webhooks). This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteAccountLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={(e) => {
                            e.preventDefault()
                            handleDeleteAccount()
                          }}
                          disabled={deleteAccountLoading}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deleteAccountLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Deleting…
                            </>
                          ) : (
                            "Delete account"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
