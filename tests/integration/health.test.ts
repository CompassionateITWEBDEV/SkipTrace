import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  testDatabaseConnection: vi.fn(),
  db: {},
}))

describe("Health API integration", () => {
  beforeEach(async () => {
    const { testDatabaseConnection } = await import("@/lib/db")
    vi.mocked(testDatabaseConnection).mockResolvedValue(true)
    delete process.env.REDIS_HOST
  })

  it("returns 200 with status, timestamp, services, and latencyMs", async () => {
    const { GET } = await import("@/app/api/health/route")
    const res = await GET()
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toHaveProperty("status")
    expect(["healthy", "degraded", "unhealthy"]).toContain(data.status)
    expect(data).toHaveProperty("timestamp")
    expect(data).toHaveProperty("services")
    expect(data.services).toHaveProperty("database")
    expect(data.services.database).toMatchObject({ status: "up", responseTime: expect.any(Number) })
    expect(data).toHaveProperty("latencyMs")
    expect(typeof data.latencyMs).toBe("number")
  })

  it("reports database down when testDatabaseConnection fails", async () => {
    const { testDatabaseConnection } = await import("@/lib/db")
    vi.mocked(testDatabaseConnection).mockResolvedValue(false)

    const { GET } = await import("@/app/api/health/route")
    const res = await GET()
    const data = await res.json()

    expect(res.status).toBe(503)
    expect(data.services.database.status).toBe("down")
    expect(data.status).toBe("unhealthy")
  })
})
