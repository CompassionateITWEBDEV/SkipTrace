export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data || data.length === 0) return

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers.map((header) => {
        const value = row[header]
        const stringValue = value?.toString() || ""
        return stringValue.includes(",") ? `"${stringValue}"` : stringValue
      }).join(",")
    ),
  ].join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", `${filename}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function exportToJSON(data: unknown, filename: string) {
  const jsonContent = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonContent], { type: "application/json" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", `${filename}.json`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Export data to PDF format
 * Uses server-side PDF generation for professional reports
 */
export async function exportToPDF(
  data: unknown,
  filename: string,
  title?: string,
  searchType?: string,
  query?: unknown,
): Promise<void> {
  try {
    // Validate data exists
    if (!data) {
      console.error("Cannot export report: no results data")
      throw new Error("No data provided for PDF export")
    }

    // Call server-side PDF generation endpoint
    const response = await fetch("/api/export/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || "Skip Trace Report",
        data,
        searchType,
        query,
      }),
    })

    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = "Failed to generate PDF"
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorMessage
      } catch {
        errorMessage = `Failed to generate PDF: ${response.status} ${response.statusText}`
      }
      throw new Error(errorMessage)
    }

    const contentType = response.headers.get("content-type") || ""
    
    // Handle PDF response (primary)
    if (contentType.includes("application/pdf")) {
      const pdfBlob = await response.blob()
      const link = document.createElement("a")
      const url = URL.createObjectURL(pdfBlob)
      const contentDisposition = response.headers.get("content-disposition")
      let pdfFilename = filename
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i)
        if (filenameMatch) {
          pdfFilename = filenameMatch[1]
        }
      }
      
      link.setAttribute("href", url)
      link.setAttribute("download", pdfFilename.endsWith(".pdf") ? pdfFilename : `${pdfFilename}.pdf`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } 
    // Handle JSON response with HTML (fallback when Puppeteer fails)
    else if (contentType.includes("application/json")) {
      const result = await response.json()
      if (result.html) {
        // Create a blob from the HTML and trigger download
        const blob = new Blob([result.html], { type: "text/html" })
        const link = document.createElement("a")
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", `${result.filename || filename}.html`)
        link.style.visibility = "hidden"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        
        if (result.error) {
          console.warn("PDF generation failed, HTML exported instead:", result.error)
        }
      } else {
        throw new Error("Invalid response format: missing HTML")
      }
    } 
    // Handle direct HTML response (backward compatibility)
    else if (contentType.includes("text/html")) {
      const htmlContent = await response.text()
      const blob = new Blob([htmlContent], { type: "text/html" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `${filename}.html`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } else {
      throw new Error(`Invalid response content type: ${contentType}`)
    }
  } catch (error) {
    console.error("PDF export error:", error)
    // Fallback to JSON export if data exists
    if (data) {
      try {
        exportToJSON(data, filename)
      } catch (jsonError) {
        console.error("Failed to export as JSON:", jsonError)
      }
    }
    throw error // Re-throw to allow caller to handle
  }
}
