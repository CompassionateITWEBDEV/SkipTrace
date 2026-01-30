import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@prisma/client", () => ({
  Prisma: { NotFoundError: class extends Error { name = "NotFoundError" } },
  __esModule: true,
}))

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
  dbOperation: vi.fn((fn: () => Promise<unknown>) => fn()),
}))

vi.mock("@/lib/audit-log", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}))

const mockSubscriptionUpdatedEvent = {
  type: "customer.subscription.updated",
  data: {
    object: {
      id: "sub_1",
      customer: "cus_123",
      items: {
        data: [{ price: { id: "price_professional" } }],
      },
    },
  },
}

vi.mock("@/lib/stripe", () => ({
  stripe: {},
  verifyWebhookSignature: vi.fn().mockReturnValue(mockSubscriptionUpdatedEvent),
  getPriceIdForPlan: vi.fn(),
  getSubscriptionDetails: vi.fn(),
}))

describe("Billing webhook integration", () => {
  beforeEach(async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"
    const { db } = await import("@/lib/db")
    vi.mocked(db.user.updateMany).mockResolvedValue({ count: 1 } as never)
  })

  it("POST /api/billing/webhook updates user plan on customer.subscription.updated", async () => {
    const { POST } = await import("@/app/api/billing/webhook/route")
    const body = JSON.stringify(mockSubscriptionUpdatedEvent)
    const res = await POST(
      new Request("http://localhost/api/billing/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": "v1,signature",
        },
        body,
      }),
    )
    expect(res.status).toBe(200)

    const { db } = await import("@/lib/db")
    expect(db.user.updateMany).toHaveBeenCalledWith({
      where: { stripeCustomerId: "cus_123" },
      data: { plan: "PROFESSIONAL" },
    })
  })

  it("POST /api/billing/webhook sets plan FREE on customer.subscription.deleted", async () => {
    const { verifyWebhookSignature } = await import("@/lib/stripe")
    vi.mocked(verifyWebhookSignature).mockReturnValueOnce({
      type: "customer.subscription.deleted",
      data: { object: { customer: "cus_456" } },
    } as never)

    const { POST } = await import("@/app/api/billing/webhook/route")
    const res = await POST(
      new Request("http://localhost/api/billing/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": "v1,sig",
        },
        body: JSON.stringify({ type: "customer.subscription.deleted", data: { object: { customer: "cus_456" } } }),
      }),
    )
    expect(res.status).toBe(200)

    const { db } = await import("@/lib/db")
    expect(db.user.updateMany).toHaveBeenCalledWith({
      where: { stripeCustomerId: "cus_456" },
      data: { plan: "FREE" },
    })
  })

  it("POST /api/billing/webhook returns 400 when signature missing", async () => {
    const { POST } = await import("@/app/api/billing/webhook/route")
    const res = await POST(
      new Request("http://localhost/api/billing/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }),
    )
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain("signature")
  })
})
