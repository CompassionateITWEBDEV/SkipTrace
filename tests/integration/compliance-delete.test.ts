import { describe, it, expect, vi, beforeEach } from "vitest"

// Satisfy error-handler's Prisma import so compliance route can load
vi.mock("@prisma/client", () => ({
  Prisma: {
    PrismaClientKnownRequestError: class extends Error { code = "P2002" },
    PrismaClientValidationError: class extends Error {},
    PrismaClientInitializationError: class extends Error {},
    PrismaClientRustPanicError: class extends Error {},
  },
  __esModule: true,
}))

// Avoid loading NextAuth route (which pulls in db/Prisma) when lib/auth is loaded
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({
  authOptions: { providers: [], secret: "test", session: { strategy: "jwt" } },
}))

const mockUser = { id: "user-1", email: "test@example.com", plan: "FREE" }

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue(mockUser),
  getCurrentUser: vi.fn().mockResolvedValue(null),
}))

vi.mock("@/lib/audit-log", () => ({
  logDataDeletion: vi.fn().mockResolvedValue(undefined),
  logAccountDeletion: vi.fn().mockResolvedValue(undefined),
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    searchLog: { updateMany: vi.fn() },
    savedSearch: { deleteMany: vi.fn() },
    report: { deleteMany: vi.fn() },
    monitoringSubscription: { deleteMany: vi.fn() },
    apiKey: { deleteMany: vi.fn() },
    notification: { deleteMany: vi.fn() },
    batchJob: { updateMany: vi.fn() },
  },
  dbOperation: vi.fn((fn: () => Promise<unknown>) => fn()),
}))

describe("Compliance delete-data integration", () => {
  beforeEach(async () => {
    const { db } = await import("@/lib/db")
    vi.mocked(db.user.findUnique).mockReset()
    vi.mocked(db.user.delete).mockReset()
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: mockUser.id,
      email: mockUser.email,
      name: null,
      plan: mockUser.plan,
      createdAt: new Date(),
    } as never)
    vi.mocked(db.searchLog.updateMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(db.savedSearch.deleteMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(db.report.deleteMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(db.monitoringSubscription.deleteMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(db.apiKey.deleteMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(db.notification.deleteMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(db.batchJob.updateMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(db.user.delete).mockResolvedValue({} as never)
  })

  it("POST with deleteAccount: true deletes user and returns account: true", async () => {
    const { POST } = await import("@/app/api/compliance/delete-data/route")
    const res = await POST(
      new Request("http://localhost/api/compliance/delete-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteAccount: true, reason: "User requested" }),
      }),
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.deleted).toMatchObject({
      account: true,
      searchLogs: true,
      savedSearches: true,
      reports: true,
      notifications: true,
    })
    expect(data.message).toContain("permanently deleted")
    expect(data.deletedAt).toBeDefined()

    const { db } = await import("@/lib/db")
    expect(db.user.delete).toHaveBeenCalledWith({ where: { id: mockUser.id } })
  })

  it("POST without deleteAccount returns account retained", async () => {
    const { POST } = await import("@/app/api/compliance/delete-data/route")
    const res = await POST(
      new Request("http://localhost/api/compliance/delete-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Data only" }),
      }),
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.deleted.account).toBeUndefined()
    expect(data.message).toContain("account retained")

    const { db } = await import("@/lib/db")
    expect(db.user.delete).not.toHaveBeenCalled()
  })

  it("POST returns 404 when user not found in DB", async () => {
    const { db } = await import("@/lib/db")
    vi.mocked(db.user.findUnique).mockResolvedValue(null)

    const { POST } = await import("@/app/api/compliance/delete-data/route")
    const res = await POST(
      new Request("http://localhost/api/compliance/delete-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteAccount: true }),
      }),
    )

    expect(res.status).toBe(404)
  })
})
