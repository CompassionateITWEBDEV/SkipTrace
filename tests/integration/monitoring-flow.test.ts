import { describe, it, expect, vi, beforeEach } from "vitest"

// Avoid loading real Prisma client when route pulls in createErrorResponse -> @prisma/client
vi.mock("@prisma/client", () => ({
  Prisma: { NotFoundError: class extends Error { name = "NotFoundError" } },
  __esModule: true,
}))

const mockUser = { id: "user-1", email: "test@example.com", plan: "FREE", role: "USER" }

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue(mockUser),
}))

vi.mock("@/lib/db", () => ({
  db: {
    monitoringSubscription: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
  dbOperation: vi.fn((fn: () => Promise<unknown>) => fn()),
}))

vi.mock("@/lib/queue", () => ({
  addMonitoringJob: vi.fn().mockResolvedValue(undefined),
}))

describe("Monitoring flow integration", () => {
  beforeEach(async () => {
    const { db } = await import("@/lib/db")
    vi.mocked(db.monitoringSubscription.findUnique).mockResolvedValue(null)
    vi.mocked(db.monitoringSubscription.create).mockResolvedValue({
      id: "sub-1",
      userId: mockUser.id,
      targetType: "email",
      targetValue: "test@example.com",
      frequency: "weekly",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastChecked: null,
      nextCheck: new Date(),
    } as never)
  })

  it("POST /api/monitoring creates subscription with targetType, targetValue, frequency", async () => {
    const { POST } = await import("@/app/api/monitoring/route")
    const res = await POST(
      new Request("http://localhost/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "email",
          targetValue: "test@example.com",
          frequency: "weekly",
        }),
      }),
    )
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.subscription).toBeDefined()
    expect(data.subscription.targetType).toBe("email")
    expect(data.subscription.targetValue).toBe("test@example.com")
    expect(data.subscription.frequency).toBe("weekly")

    const { addMonitoringJob } = await import("@/lib/queue")
    expect(addMonitoringJob).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionId: "sub-1",
        targetType: "email",
        targetValue: "test@example.com",
      }),
    )
  })

  it("POST /api/monitoring returns 400 when targetType or targetValue missing", async () => {
    const { POST } = await import("@/app/api/monitoring/route")
    const res = await POST(
      new Request("http://localhost/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: "email" }),
      }),
    )
    expect(res.status).toBe(400)
  })
})
