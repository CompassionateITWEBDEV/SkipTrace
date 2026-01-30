import { describe, it, expect, vi, beforeEach } from "vitest"
import { hasRole, isAdmin } from "@/lib/rbac"

vi.mock("@/lib/db", () => ({
  db: { user: { findUnique: vi.fn() } },
  dbOperation: vi.fn((fn: () => Promise<unknown>) => fn()),
}))

const { db } = await import("@/lib/db")

describe("rbac", () => {
  beforeEach(() => {
    vi.mocked(db.user.findUnique).mockReset()
  })

  it("hasRole returns true for ADMIN when user.role is ADMIN", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({ role: "ADMIN" } as never)
    expect(await hasRole("user-1", "ADMIN")).toBe(true)
  })

  it("hasRole returns false for ADMIN when user.role is USER", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({ role: "USER" } as never)
    expect(await hasRole("user-1", "ADMIN")).toBe(false)
  })

  it("hasRole returns false when user not found", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null)
    expect(await hasRole("user-1", "ADMIN")).toBe(false)
  })

  it("isAdmin returns true when user has ADMIN role", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({ role: "ADMIN" } as never)
    expect(await isAdmin("user-1")).toBe(true)
  })
})
