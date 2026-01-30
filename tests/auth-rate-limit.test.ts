import { describe, it, expect, vi, beforeEach } from "vitest"

const mockCacheGet = vi.fn()
const mockCacheSet = vi.fn()

vi.mock("@/lib/cache", () => ({
  cache: {
    get: (...args: unknown[]) => mockCacheGet(...args),
    set: (...args: unknown[]) => mockCacheSet(...args),
  },
}))

describe("Auth rate limit", () => {
  beforeEach(() => {
    mockCacheGet.mockReset()
    mockCacheSet.mockReset()
    mockCacheGet.mockResolvedValue(null)
    mockCacheSet.mockResolvedValue(undefined)
  })

  it("allows first attempt and records count", async () => {
    const { checkAuthRateLimit } = await import("@/lib/auth-rate-limit")
    const result = await checkAuthRateLimit("192.168.1.1")
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(9)
    expect(mockCacheSet).toHaveBeenCalledWith(
      "auth:attempts:192.168.1.1",
      1,
      expect.any(Number),
    )
  })

  it("denies when count already at max", async () => {
    mockCacheGet.mockResolvedValue(10)
    const { checkAuthRateLimit } = await import("@/lib/auth-rate-limit")
    const result = await checkAuthRateLimit("10.0.0.1")
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(mockCacheSet).not.toHaveBeenCalled()
  })

  it("getClientIdentifier uses x-forwarded-for when present", async () => {
    const { getClientIdentifier } = await import("@/lib/auth-rate-limit")
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": " 203.0.113.1, 70.41.3.18" },
    })
    expect(getClientIdentifier(req)).toBe("203.0.113.1")
  })

  it("getClientIdentifier uses x-real-ip when x-forwarded-for absent", async () => {
    const { getClientIdentifier } = await import("@/lib/auth-rate-limit")
    const req = new Request("http://localhost", {
      headers: { "x-real-ip": "198.51.100.1" },
    })
    expect(getClientIdentifier(req)).toBe("198.51.100.1")
  })
})
