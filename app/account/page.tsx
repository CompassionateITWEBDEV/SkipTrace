"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Key, Copy, Eye, EyeOff, Plus, Trash2, User, CreditCard, Settings, Loader2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSession } from "next-auth/react"

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
  const [_usage, setUsage] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [creatingKey, setCreatingKey] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    fetchApiKeys()
    fetchUsage()
  }, [])

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
          <TabsList>
            <TabsTrigger value="api-keys" className="gap-2">
              <Key className="h-4 w-4" />
              API Keys
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
                    <CardDescription>Manage your API keys for accessing MASE Intelligence services</CardDescription>
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
                      <span className="text-sm font-medium">API Calls This Month</span>
                      <span className="text-sm text-muted-foreground">2,847 / 10,000</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: "28.47%" }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Batch Searches</span>
                      <span className="text-sm text-muted-foreground">142 / 500</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-chart-2" style={{ width: "28.4%" }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Data Export</span>
                      <span className="text-sm text-muted-foreground">68 / 200</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-chart-3" style={{ width: "34%" }} />
                    </div>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-6 bg-transparent">
                  Upgrade Plan
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your account profile and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" name="firstName" autoComplete="given-name" defaultValue="John" />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" name="lastName" autoComplete="family-name" defaultValue="Doe" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    defaultValue={session?.user?.email || ""}
                    disabled
                  />
                  <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" name="company" autoComplete="organization" defaultValue="ACME Investigations" />
                </div>
                <Button>Save Changes</Button>
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
                        <h4 className="font-semibold">Professional Plan</h4>
                        <p className="text-sm text-muted-foreground">$99/month</p>
                      </div>
                      <Badge>Active</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Next billing date: February 15, 2024
                    </p>
                    <Button variant="outline" className="bg-transparent">Manage Subscription</Button>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-4">Payment Method</h4>
                    <div className="border border-border rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">•••• •••• •••• 4242</p>
                          <p className="text-sm text-muted-foreground">Expires 12/25</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="bg-transparent">Update</Button>
                    </div>
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
                  <h4 className="font-semibold text-destructive">Danger Zone</h4>
                  <Button variant="destructive" className="w-full">Delete Account</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
