"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  FolderOpen,
  Plus,
  Loader2,
  FileText,
  MoreHorizontal,
  CircleDot,
  Circle,
  CheckCircle2,
} from "lucide-react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface CaseRecord {
  id: string
  name: string
  description: string | null
  status: string
  reportIds: string[]
  createdAt: string
  updatedAt: string
}

export default function CasesPage() {
  const [cases, setCases] = useState<CaseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")

  useEffect(() => {
    fetchCases()
  }, [])

  const fetchCases = async () => {
    try {
      const response = await fetch("/api/cases")
      if (response.ok) {
        const data = await response.json()
        setCases(data.cases || [])
      }
    } catch (error) {
      console.error("Error fetching cases:", error)
    } finally {
      setLoading(false)
    }
  }

  const createCase = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || undefined,
        }),
      })
      if (response.ok) {
        const created = await response.json()
        setCases([created, ...cases])
        setNewName("")
        setNewDescription("")
        setShowCreate(false)
      }
    } catch (error) {
      console.error("Error creating case:", error)
    } finally {
      setCreating(false)
    }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (response.ok) {
        const updated = await response.json()
        setCases(cases.map((c) => (c.id === id ? updated : c)))
      }
    } catch (error) {
      console.error("Error updating case:", error)
    }
  }

  const deleteCase = async (id: string) => {
    if (!confirm("Delete this case? Reports linked to it will not be deleted.")) return
    try {
      const response = await fetch(`/api/cases/${id}`, { method: "DELETE" })
      if (response.ok) setCases(cases.filter((c) => c.id !== id))
    } catch (error) {
      console.error("Error deleting case:", error)
    }
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "OPEN":
        return <CircleDot className="h-4 w-4" />
      case "IN_PROGRESS":
        return <Circle className="h-4 w-4" />
      case "CLOSED":
        return <CheckCircle2 className="h-4 w-4" />
      default:
        return <CircleDot className="h-4 w-4" />
    }
  }

  const statusLabel = (status: string) =>
    status === "IN_PROGRESS" ? "In Progress" : status.charAt(0) + status.slice(1).toLowerCase()

  return (
    <main className="min-h-screen bg-background pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Cases</h1>
            <p className="text-muted-foreground">Organize searches and reports into cases</p>
          </div>
          <Button className="gap-2 shrink-0" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            New Case
          </Button>
        </div>

        {showCreate && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle>New Case</CardTitle>
              <CardDescription>Create a case to group related reports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="case-name">Name</Label>
                <Input
                  id="case-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Smith Investigation"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="case-desc">Description (optional)</Label>
                <Input
                  id="case-desc"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Brief description"
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={createCase} disabled={creating || !newName.trim()}>
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create"
                  )}
                </Button>
                <Button variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : cases.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No cases yet. Create one to organize your reports.</p>
              <Button onClick={() => setShowCreate(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                New Case
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cases.map((c) => (
              <Card key={c.id} className="flex flex-col">
                <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-lg truncate">
                      <Link href={`/cases/${c.id}`} className="hover:underline">
                        {c.name}
                      </Link>
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {c.description || "No description"}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => updateStatus(c.id, "OPEN")}>
                        Open
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateStatus(c.id, "IN_PROGRESS")}>
                        In Progress
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateStatus(c.id, "CLOSED")}>
                        Closed
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deleteCase(c.id)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="pt-0 mt-auto">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <Badge variant="secondary" className="gap-1">
                      {statusIcon(c.status)}
                      {statusLabel(c.status)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {c.reportIds?.length ?? 0} report{c.reportIds?.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Link href={`/cases/${c.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        View Case
                      </Button>
                    </Link>
                    <Link href={`/reports?caseId=${c.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        <FileText className="h-4 w-4" />
                        Reports
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
