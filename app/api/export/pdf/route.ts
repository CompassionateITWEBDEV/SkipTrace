import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createErrorResponse, ValidationError } from "@/lib/error-handler"
import type { Browser } from "puppeteer"

// Force dynamic rendering to prevent build-time issues
export const dynamic = "force-dynamic"

/**
 * Generate a professional PDF report from search results
 * This is a server-side endpoint that generates PDFs using Puppeteer
 */
export async function POST(request: Request) {
  let browser: Browser | null = null
  
  const cleanupBrowser = async () => {
    if (browser) {
      try {
        await browser.close()
      } catch (closeError) {
        console.error("Error closing browser:", closeError)
      }
      browser = null
    }
  }
  
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch {
      throw new ValidationError("Invalid JSON in request body")
    }

    const { title, data, searchType, query } = body

    if (!data) {
      throw new ValidationError("Data is required to generate PDF")
    }

    // Generate professional HTML content for the PDF
    const htmlContent = generateReportHTML(title || "Skip Trace Report", data, searchType, query)

    // Generate PDF using Puppeteer (dynamic import for Vercel/serverless compatibility)
    try {
      const puppeteer = await import("puppeteer")
      browser = await puppeteer.default.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
        ],
      })

      const page = await browser.newPage()
      await page.setContent(htmlContent, { waitUntil: "networkidle0" })

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "20mm",
          right: "15mm",
          bottom: "20mm",
          left: "15mm",
        },
      })

      await browser.close()

      const filename = `${(title || "report").replace(/[^a-z0-9]/gi, "_")}-${new Date().toISOString().split("T")[0]}.pdf`

      return new NextResponse(Buffer.from(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": pdfBuffer.length.toString(),
        },
      })
    } catch (puppeteerError) {
      // Close browser if it was opened
      await cleanupBrowser()
      
      console.error("Puppeteer PDF generation error:", puppeteerError)
      // Fallback: return HTML if Puppeteer fails (e.g., in serverless environments)
      const filename = `${(title || "report").replace(/[^a-z0-9]/gi, "_")}-${new Date().toISOString().split("T")[0]}.html`
      
      return NextResponse.json({
        html: htmlContent,
        filename,
        error: "PDF generation failed, returning HTML instead",
      }, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      })
    }
  } catch (error) {
    await cleanupBrowser()
    console.error("PDF export error:", error)
    return createErrorResponse(error, "Failed to generate PDF report")
  }
}

function generateReportHTML(
  title: string,
  data: unknown,
  searchType?: string,
  query?: unknown,
): string {
  const dataObj = data as Record<string, unknown>
  const skipTrace = (dataObj.skipTrace || dataObj.skipTraceData) as Record<string, unknown> | undefined
  const person = skipTrace?.person || (skipTrace?.data as Record<string, unknown>)?.person
  const socialMedia = dataObj.socialMedia || dataObj.socialMediaData
  const residents = dataObj.residents as Array<Record<string, unknown>> | undefined
  const propertyInfo = dataObj.propertyInfo as Record<string, unknown> | undefined

  const queryStr = query
    ? typeof query === "string"
      ? query
      : JSON.stringify(query, null, 2)
    : ""

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #ffffff;
      padding: 40px;
      max-width: 900px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 4px solid #1e40af;
      padding-bottom: 25px;
      margin-bottom: 35px;
    }
    .header h1 {
      color: #1e40af;
      margin: 0 0 10px 0;
      font-size: 32px;
      font-weight: 700;
    }
    .header .meta {
      color: #6b7280;
      font-size: 14px;
      margin-top: 10px;
    }
    .header .meta-item {
      margin: 5px 0;
    }
    .section {
      margin: 35px 0;
      padding: 25px;
      background: #f9fafb;
      border-left: 5px solid #1e40af;
      border-radius: 4px;
    }
    .section h2 {
      color: #1e40af;
      margin: 0 0 20px 0;
      font-size: 22px;
      font-weight: 600;
    }
    .data-grid {
      display: grid;
      gap: 15px;
    }
    .data-item {
      padding: 12px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .data-item:last-child {
      border-bottom: none;
    }
    .label {
      font-weight: 600;
      color: #4b5563;
      display: inline-block;
      min-width: 140px;
      margin-right: 10px;
    }
    .value {
      color: #111827;
      word-break: break-word;
    }
    .badge {
      display: inline-block;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      margin: 4px 4px 4px 0;
    }
    .badge-success {
      background: #d1fae5;
      color: #065f46;
    }
    .badge-info {
      background: #dbeafe;
      color: #1e40af;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    .table th,
    .table td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    .table th {
      background: #f3f4f6;
      font-weight: 600;
      color: #374151;
    }
    .footer {
      margin-top: 50px;
      padding-top: 25px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    .logo {
      font-size: 28px;
      font-weight: 700;
      color: #1e40af;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    .logo::before {
      content: "🔍 ";
      font-size: 24px;
    }
    .summary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin: 25px 0;
    }
    .summary h3 {
      color: white;
      margin: 0 0 15px 0;
      font-size: 18px;
    }
    .summary-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }
    .stat-item {
      background: rgba(255, 255, 255, 0.2);
      padding: 10px;
      border-radius: 6px;
      text-align: center;
    }
    .stat-value {
      font-size: 24px;
      font-weight: 700;
      display: block;
    }
    .stat-label {
      font-size: 12px;
      opacity: 0.9;
      margin-top: 5px;
    }
    @media print {
      body { 
        padding: 20px;
        max-width: 100%;
      }
      .section { 
        page-break-inside: avoid;
        margin: 20px 0;
      }
      .header {
        page-break-after: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">SkipTrace</div>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">
      <div class="meta-item"><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
      ${searchType ? `<div class="meta-item"><strong>Search Type:</strong> ${escapeHtml(searchType.charAt(0).toUpperCase() + searchType.slice(1))}</div>` : ""}
      ${queryStr ? `<div class="meta-item"><strong>Query:</strong> ${escapeHtml(queryStr.length > 100 ? queryStr.substring(0, 100) + "..." : queryStr)}</div>` : ""}
    </div>
  </div>

  ${generateSummarySection(dataObj, person as Record<string, unknown> | undefined, residents, propertyInfo, socialMedia as Record<string, unknown> | undefined)}
  ${person ? generatePersonSection(person as Record<string, unknown>) : ""}
  ${residents ? generateResidentsSection(residents) : ""}
  ${propertyInfo ? generatePropertySection(propertyInfo) : ""}
  ${socialMedia ? generateSocialMediaSection(socialMedia as Record<string, unknown>) : ""}

  <div class="footer">
    <p><strong>SkipTrace Report</strong></p>
    <p>This report was generated by SkipTrace. All information is subject to verification.</p>
    <p style="margin-top: 10px;"><em>Confidential - For authorized use only</em></p>
    <p style="margin-top: 5px; font-size: 11px;">Report ID: ${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `RPT-${Date.now()}-${Math.random().toString(36).substring(7)}`}</p>
  </div>
</body>
</html>
  `
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

function generatePersonSection(person: Record<string, unknown>): string {
  const names = extractArray(person.names)
  const emails = extractArray(person.emails)
  const phones = extractArray(person.phones)
  const addresses = extractArray(person.addresses)
  const jobs = Array.isArray(person.jobs) ? person.jobs : []

  if (names.length === 0 && emails.length === 0 && phones.length === 0 && addresses.length === 0 && jobs.length === 0) {
    return ""
  }

  return `
  <div class="section">
    <h2>Personal Information</h2>
    <div class="data-grid">
      ${names.length > 0 ? `<div class="data-item"><span class="label">Names:</span><span class="value">${names.map(escapeHtml).join(", ")}</span></div>` : ""}
      ${emails.length > 0 ? `<div class="data-item"><span class="label">Email Addresses:</span><span class="value">${emails.map(escapeHtml).join(", ")}</span></div>` : ""}
      ${phones.length > 0 ? `<div class="data-item"><span class="label">Phone Numbers:</span><span class="value">${phones.map(escapeHtml).join(", ")}</span></div>` : ""}
      ${addresses.length > 0 ? `<div class="data-item"><span class="label">Addresses:</span><span class="value">${addresses.map(escapeHtml).join("; ")}</span></div>` : ""}
      ${jobs.length > 0 ? generateJobsSection(jobs) : ""}
    </div>
  </div>
  `
}

function generateResidentsSection(residents: Array<Record<string, unknown>>): string {
  if (residents.length === 0) return ""

  return `
  <div class="section">
    <h2>Residents at Address</h2>
    <table class="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Phone</th>
          <th>Email</th>
        </tr>
      </thead>
      <tbody>
        ${residents
          .map(
            (resident) => `
          <tr>
            <td>${escapeHtml(String(resident.name || "N/A"))}</td>
            <td>${escapeHtml(String(resident.phone || "N/A"))}</td>
            <td>${escapeHtml(String(resident.email || "N/A"))}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  </div>
  `
}

function generatePropertySection(propertyInfo: Record<string, unknown>): string {
  const address = String(propertyInfo.address || "")
  const type = String(propertyInfo.type || "N/A")
  const county = String(propertyInfo.county || "N/A")
  const owner = propertyInfo.owner ? String(propertyInfo.owner) : null
  const estimatedValue = propertyInfo.estimatedValue ? String(propertyInfo.estimatedValue) : null
  const lastSaleDate = propertyInfo.lastSaleDate ? String(propertyInfo.lastSaleDate) : null

  return `
  <div class="section">
    <h2>Property Information</h2>
    <div class="data-grid">
      <div class="data-item"><span class="label">Address:</span><span class="value">${escapeHtml(address)}</span></div>
      <div class="data-item"><span class="label">Property Type:</span><span class="value">${escapeHtml(type)}</span></div>
      <div class="data-item"><span class="label">County:</span><span class="value">${escapeHtml(county)}</span></div>
      ${owner ? `<div class="data-item"><span class="label">Owner:</span><span class="value">${escapeHtml(owner)}</span></div>` : ""}
      ${estimatedValue ? `<div class="data-item"><span class="label">Estimated Value:</span><span class="value">${escapeHtml(estimatedValue)}</span></div>` : ""}
      ${lastSaleDate ? `<div class="data-item"><span class="label">Last Sale Date:</span><span class="value">${escapeHtml(lastSaleDate)}</span></div>` : ""}
    </div>
  </div>
  `
}

function generateSocialMediaSection(socialMedia: Record<string, unknown>): string {
  const platforms = Object.entries(socialMedia)
    .filter(([, value]) => {
      if (typeof value === "boolean") return value
      if (typeof value === "object" && value !== null) {
        return (value as { registered?: boolean }).registered !== false
      }
      return false
    })
    .map(([platform, value]) => {
      const platformData = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {}
      return {
        name: platform,
        username: platformData.username ? String(platformData.username) : null,
        url: platformData.url ? String(platformData.url) : null,
      }
    })

  if (platforms.length === 0) return ""

  return `
  <div class="section">
    <h2>Social Media Presence</h2>
    <div class="data-grid">
      ${platforms
        .map(
          (platform) => `
        <div class="data-item">
          <span class="label">${escapeHtml(platform.name)}:</span>
          <span class="value">
            <span class="badge badge-success">${escapeHtml(platform.name)}</span>
            ${platform.username ? `<span style="margin-left: 10px;">@${escapeHtml(platform.username)}</span>` : ""}
            ${platform.url ? `<a href="${escapeHtml(platform.url)}" style="margin-left: 10px; color: #1e40af;">View Profile</a>` : ""}
          </span>
        </div>
      `,
        )
        .join("")}
    </div>
  </div>
  `
}

function generateJobsSection(jobs: unknown[]): string {
  if (jobs.length === 0) return ""

  return `
    <div style="margin-top: 15px;">
      <div style="font-weight: 600; margin-bottom: 10px; color: #4b5563;">Employment History:</div>
      ${jobs
        .map((job) => {
          const j = job as Record<string, unknown>
          const title = String(j.title || j.position || "Unknown Position")
          const company = String(j.company || j.organization || "Unknown Company")
          return `<div class="data-item">${escapeHtml(title)} at ${escapeHtml(company)}</div>`
        })
        .join("")}
    </div>
  `
}

function generateSummarySection(
  dataObj: Record<string, unknown>,
  person: Record<string, unknown> | undefined,
  residents: Array<Record<string, unknown>> | undefined,
  propertyInfo: Record<string, unknown> | undefined,
  socialMedia: Record<string, unknown> | undefined,
): string {
  const names = person ? extractArray(person.names) : []
  const emails = person ? extractArray(person.emails) : []
  const phones = person ? extractArray(person.phones) : []
  const addresses = person ? extractArray(person.addresses) : []
  const jobs = person && Array.isArray(person.jobs) ? person.jobs : []
  const socialPlatforms = socialMedia
    ? Object.entries(socialMedia).filter(([, value]) => {
        if (typeof value === "boolean") return value
        if (typeof value === "object" && value !== null) {
          return (value as { registered?: boolean }).registered !== false
        }
        return false
      }).length
    : 0

  const totalDataPoints = names.length + emails.length + phones.length + addresses.length + jobs.length + socialPlatforms + (residents?.length || 0)

  return `
  <div class="summary">
    <h3>Executive Summary</h3>
    <p style="margin: 0 0 15px 0; opacity: 0.95;">This report contains comprehensive information gathered from multiple data sources.</p>
    <div class="summary-stats">
      <div class="stat-item">
        <span class="stat-value">${names.length}</span>
        <span class="stat-label">Names Found</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${phones.length}</span>
        <span class="stat-label">Phone Numbers</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${addresses.length}</span>
        <span class="stat-label">Addresses</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${emails.length}</span>
        <span class="stat-label">Email Addresses</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${socialPlatforms}</span>
        <span class="stat-label">Social Platforms</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${totalDataPoints}</span>
        <span class="stat-label">Total Data Points</span>
      </div>
    </div>
  </div>
  `
}

function extractArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => {
      if (typeof v === "string") return v
      if (typeof v === "object" && v !== null) {
        const obj = v as Record<string, unknown>
        return (obj.display || obj.full || obj.address || obj.number || obj.email || "").toString()
      }
      return String(v)
    })
  }
  if (value) {
    return [String(value)]
  }
  return []
}
