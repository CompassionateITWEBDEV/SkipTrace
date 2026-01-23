"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

export function DownloadOpenApiButton() {
  return (
    <Button
      variant="outline"
      onClick={() => {
        window.open("/docs/api/openapi.json", "_blank")
      }}
    >
      <Download className="mr-2 h-4 w-4" />
      Download OpenAPI Spec (JSON)
    </Button>
  )
}
