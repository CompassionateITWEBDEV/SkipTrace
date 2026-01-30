"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, FileText, Loader2, CircleDot, Circle, CheckCircle2 } from "lucide-react"
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

export default function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const [caseId, setCaseId] = useState<string | null>(null)
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    const resolved = params instanceof Promise ? params.then((p) => p.id) : Promise.resolve(params.id)
    resolved.then((id) => setCaseId(id))
  }, [params])

  useEffect(() => {
    if (!caseId) return
    const controller = new AbortController()
    fetch(`/api/cases/${caseId}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("Case not found")
        return r.json()
      })
      .then(setCaseRecord)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message || "Failed to load case")
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [caseId])

  const updateStatus = async (status: string) => {
    if (!caseId || !caseRecord) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        const updated = await res.json()
        setCaseRecord(updated)
      }
    } catch (err) {
      console.error("Update status error:", err)
    } finally {
      setUpdating(false)
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

  if (loading || !caseId) {
    return (
      <main className="min-h-screen bg-background pt-20">
        <div className="mx-auto max-w-4xl px-4 py-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </main>
    )
  }

  if (error || !caseRecord) {
    return (
      <main className="min-h-screen bg-background pt-20">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-destructive">{error || "Case not found"}</p>
              <Link href="/cases">
                <Button variant="outline" className="mt-4 gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Cases
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background pt-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/cases">
            <Button variant="ghost" size="sm" className="gap-2 mb-4">
              <ArrowLeft className="h-4 w-4" />
              Back to Cases
            </Button>
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{caseRecord.name}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="gap-1">
                  {statusIcon(caseRecord.status)}
                  {statusLabel(caseRecord.status)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Updated {new Date(caseRecord.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={updating} className="gap-2 w-[180px]">
                  {statusIcon(caseRecord.status)}
                  {statusLabel(caseRecord.status)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => updateStatus("OPEN")}>Open</DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatus("IN_PROGRESS")}>In Progress</DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatus("CLOSED")}>Closed</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {caseRecord.description && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{caseRecord.description}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Linked Reports
            </CardTitle>
            <CardDescription>
              {caseRecord.reportIds?.length
                ? `${caseRecord.reportIds.length} report(s) linked to this case`
                : "No reports linked. Add report IDs via the API or from the report page."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {caseRecord.reportIds?.length ? (
              <ul className="space-y-2">
                {caseRecord.reportIds.map((reportId) => (
                  <li key={reportId}>
                    <Link href={`/reports/${reportId}`}>
                      <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                        <FileText className="h-4 w-4" />
                        Report {reportId.slice(0, 8)}…
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Link reports to this case by updating the case with report IDs (e.g. from the Reports page or API).
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
