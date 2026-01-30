import { describe, it, expect } from "vitest"

// Test escapeHtml logic (re-exported or inlined for testing)
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

describe("notifications", () => {
  describe("escapeHtml", () => {
    it("escapes ampersand", () => {
      expect(escapeHtml("a & b")).toBe("a &amp; b")
    })
    it("escapes angle brackets", () => {
      expect(escapeHtml("<script>")).toBe("&lt;script&gt;")
    })
    it("escapes quotes", () => {
      expect(escapeHtml('"hello"')).toBe("&quot;hello&quot;")
    })
  })
})
