import { requireAuth } from "@/lib/auth"

export const dynamic = "force-dynamic"

const SSE_REFRESH_INTERVAL_MS = 15000 // 15 seconds

/**
 * GET - Server-Sent Events stream for live notification updates.
 * Sends a "refresh" event periodically so the client can refetch notifications.
 * Client should use EventSource and on "refresh" call the notifications API.
 */
export async function GET(request: Request) {
  const user = await requireAuth().catch(() => null)
  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const signal = request.signal
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      const send = (event: string, data: string) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`))
        } catch {
          // Client disconnected
        }
      }
      send("refresh", JSON.stringify({ ts: Date.now() }))
      const interval = setInterval(() => {
        if (signal.aborted) {
          clearInterval(interval)
          return
        }
        send("refresh", JSON.stringify({ ts: Date.now() }))
      }, SSE_REFRESH_INTERVAL_MS)
      signal.addEventListener("abort", () => clearInterval(interval))
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
