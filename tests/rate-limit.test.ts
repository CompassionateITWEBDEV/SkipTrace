import { describe, it, expect, vi, beforeEach } from "vitest"
import { checkRateLimit } from "@/lib/rate-limit"

vi.mock("@/lib/db", () => ({
  db: {
    searchLog: {
      count: vi.fn(),
    },
  },
}))

vi.mock("@/lib/cache", () => ({
  cache: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
  },
}))

const { db } = await import("@/lib/db")

describe("rate-limit", () => {
  beforeEach(() => {
    vi.mocked(db.searchLog.count).mockReset()
  })

  it("allows search when under monthly and daily limits", async () => {
    vi.mocked(db.searchLog.count)
      .mockResolvedValueOnce(10) // monthly
      .mockResolvedValueOnce(3) // daily
    const result = await checkRateLimit("user-1", "FREE", "search")
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(40)
  })

  it("denies when monthly limit exceeded", async () => {
    vi.mocked(db.searchLog.count).mockResolvedValue(50)
    const result = await checkRateLimit("user-1", "FREE", "search")
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain("Monthly limit")
    expect(result.remaining).toBe(0)
  })

  it("denies batch when batch size exceeds plan limit", async () => {
    vi.mocked(db.searchLog.count).mockResolvedValue(0)
    const result = await checkRateLimit("user-1", "FREE", "batch", 50)
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain("Batch size limit")
  })
})
