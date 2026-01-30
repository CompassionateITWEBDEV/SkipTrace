import { describe, it, expect, vi, beforeEach } from "vitest"

const mockUser = { id: "user-1", email: "test@example.com", plan: "FREE", role: "USER" }

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue(mockUser),
}))

vi.mock("@/lib/db", () => ({
  db: {
    report: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

describe("Reports flow integration", () => {
  beforeEach(async () => {
    const { db } = await import("@/lib/db")
    vi.mocked(db.report.create).mockReset()
    vi.mocked(db.report.findMany).mockReset()
    vi.mocked(db.report.count).mockReset()
  })

  it("POST /api/reports creates report and GET returns it in list", async () => {
    const createdReport = {
      id: "report-1",
      title: "Email Search: test@example.com",
      createdAt: new Date().toISOString(),
    }
    const { db } = await import("@/lib/db")
    vi.mocked(db.report.create).mockResolvedValue(createdReport as never)
    vi.mocked(db.report.findMany).mockResolvedValue([
      { id: "report-1", title: createdReport.title, searchType: "EMAIL", createdAt: createdReport.createdAt, updatedAt: createdReport.createdAt, shared: false, query: "{}" },
    ] as never)
    vi.mocked(db.report.count).mockResolvedValue(1)

    const { POST } = await import("@/app/api/reports/route")
    const { GET } = await import("@/app/api/reports/route")

    const createRes = await POST(
      new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Email Search: test@example.com",
          query: { email: "test@example.com" },
          results: { skipTrace: {}, socialMedia: {} },
          searchType: "EMAIL",
        }),
      }),
    )
    expect(createRes.status).toBe(201)
    const createData = await createRes.json()
    expect(createData.report).toMatchObject({ id: "report-1", title: "Email Search: test@example.com" })

    const listRes = await GET(new Request("http://localhost/api/reports"))
    expect(listRes.status).toBe(200)
    const listData = await listRes.json()
    expect(listData.reports).toHaveLength(1)
    expect(listData.reports[0].id).toBe("report-1")
    expect(listData.pagination.total).toBe(1)
  })

  it("POST /api/reports returns 400 when title, query, or results missing", async () => {
    const { POST } = await import("@/app/api/reports/route")
    const res = await POST(
      new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Only title" }),
      }),
    )
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain("required")
  })
})
